"""
RAVEN Authentication & Client Workspace Service Layer
Contains core business logic for user lifecycle, rate limiting, and client data isolation.
"""

import uuid
import csv
from pathlib import Path
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
import aiosqlite
from fastapi import HTTPException, status

from backend.config import settings
from backend.auth.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    normalize_email,
    create_access_token,
    generate_single_use_token,
    hash_token
)
from backend.auth.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    ClientReportCreate,
    ClientConfigUpdate
)
from backend.auth.email_service import email_service


# ---------------------------------------------------------------------------
# Audit Logging & Brute-Force Rate Limiting
# ---------------------------------------------------------------------------

async def record_audit_log(
    db: aiosqlite.Connection,
    event_type: str,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[str] = None
) -> None:
    """Inserts a record into the database audit ledger and appends to logs/login_records.log."""
    await db.execute(
        """
        INSERT INTO security_audit_logs (user_id, email, event_type, ip_address, user_agent, details)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (user_id, email, event_type, ip_address, user_agent, details)
    )
    await db.commit()

    # Append to dedicated login records file
    try:
        log_file = Path("logs/login_records.log")
        log_file.parent.mkdir(parents=True, exist_ok=True)
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"[{now_str}] EVENT={event_type} | EMAIL={email or 'N/A'} | USER_ID={user_id or 'N/A'} | IP={ip_address or '127.0.0.1'} | DETAILS={details or ''}\n")
    except Exception as e:
        print(f"[Login File Logger] Warning: Could not write to login_records.log: {e}")


def log_user_login_attempt(
    entered_username: Optional[str],
    saved_as_username: Optional[str],
    ip_address: Optional[str]
) -> None:
    """
    Appends a structured login attempt record to data/user_logs.txt.
    Enforces exact 5-column CSV header:
    Date & Time,Entered Username,Entered Password,Saved As Username,IP Address
    Passwords are ALWAYS written as [REDACTED] to guarantee zero secret leakage.
    Uses RFC 4180 compliant CSV quoting and escaping.
    """
    try:
        log_path = Path("data/user_logs.txt")
        log_path.parent.mkdir(parents=True, exist_ok=True)

        file_exists = log_path.exists() and log_path.stat().st_size > 0
        header = ["Date & Time", "Entered Username", "Entered Password", "Saved As Username", "IP Address"]

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entered_user = str(entered_username or "").strip()

        saved_user = str(saved_as_username or "").strip()
        if not saved_user or saved_user.lower() in ["none", "null", "n/a", ""]:
            saved_user = "UNKNOWN"

        ip = str(ip_address or "").strip()
        if not ip or ip.lower() in ["unknown", "none", "null", "n/a", ""]:
            ip = "UNKNOWN"

        row = [now_str, entered_user, "[REDACTED]", saved_user, ip]

        with open(log_path, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(header)
            writer.writerow(row)
    except Exception as e:
        print(f"[User Logs Error] Warning: Could not append to data/user_logs.txt: {e}")


async def check_login_rate_limit(
    db: aiosqlite.Connection,
    ip_address: str,
    email: Optional[str] = None
) -> None:
    """
    Enforces brute-force login protection:
    Rejects requests if > settings.RATE_LIMIT_LOGIN_ATTEMPTS failed attempts within RATE_LIMIT_WINDOW_SECONDS.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.RATE_LIMIT_WINDOW_SECONDS)
    cutoff_iso = cutoff.strftime("%Y-%m-%d %H:%M:%S")

    async with db.execute(
        """
        SELECT COUNT(*) as failed_count
        FROM login_rate_limits
        WHERE ip_address = ? AND success = 0 AND attempted_at >= ?
        """,
        (ip_address, cutoff_iso)
    ) as cursor:
        row = await cursor.fetchone()
        failed_count = row["failed_count"] if row else 0

        if failed_count >= settings.RATE_LIMIT_LOGIN_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed login attempts. Please wait 5 minutes before trying again."
            )


async def record_login_attempt(
    db: aiosqlite.Connection,
    ip_address: str,
    email: Optional[str],
    success: bool
) -> None:
    """Records an authentication attempt for rate-limiting analytics."""
    await db.execute(
        """
        INSERT INTO login_rate_limits (ip_address, email, success)
        VALUES (?, ?, ?)
        """,
        (ip_address, email, 1 if success else 0)
    )
    await db.commit()


# ---------------------------------------------------------------------------
# User Registration & Lifecycle
# ---------------------------------------------------------------------------

async def register_user(
    db: aiosqlite.Connection,
    req: UserRegisterRequest,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """
    Registers a new client user account with the least required privilege (role='client').
    Public registration can NEVER grant the administrator role.
    """
    # 1. Validate password strength
    valid_pw, pw_err = validate_password_strength(req.password)
    if not valid_pw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_err)

    # 2. Normalize email
    normalized = normalize_email(req.email)

    # 3. Check email uniqueness at database level
    async with db.execute("SELECT id FROM users WHERE email = ?", (normalized,)) as cursor:
        existing = await cursor.fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )

    # 4. Hash password with Argon2id
    pw_hash = hash_password(req.password)
    user_id = str(uuid.uuid4())

    # 5. Insert user record with default client role
    await db.execute(
        """
        INSERT INTO users (id, name, email, password_hash, role, is_verified, account_status)
        VALUES (?, ?, ?, ?, 'client', 0, 'active')
        """,
        (user_id, req.name.strip(), normalized, pw_hash)
    )

    # 6. Initialize dedicated client workspace configuration
    await db.execute(
        """
        INSERT INTO client_configs (user_id, workspace_name, ensemble_alpha, ensemble_threshold)
        VALUES (?, 'Primary Workspace', ?, ?)
        """,
        (user_id, settings.ENSEMBLE_ALPHA, settings.ENSEMBLE_ACCEPT_THRESHOLD)
    )

    # 7. Generate single-use email verification token
    raw_token, token_hash = generate_single_use_token()
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)).strftime("%Y-%m-%d %H:%M:%S")

    await db.execute(
        """
        INSERT INTO verification_tokens (user_id, token_hash, token_type, expires_at)
        VALUES (?, ?, 'email_verify', ?)
        """,
        (user_id, token_hash, expires_at)
    )

    await db.commit()

    # 8. Send verification email
    await email_service.send_verification_email(email=normalized, name=req.name.strip(), token=raw_token)

    # 9. Audit event
    await record_audit_log(
        db,
        event_type="REGISTRATION",
        user_id=user_id,
        email=normalized,
        ip_address=ip_address,
        user_agent=user_agent,
        details="Client account registered successfully."
    )

    return {
        "id": user_id,
        "name": req.name.strip(),
        "email": normalized,
        "role": "client",
        "is_verified": False,
        "account_status": "active"
    }


async def login_user(
    db: aiosqlite.Connection,
    req: UserLoginRequest,
    ip_address: str,
    user_agent: Optional[str] = None
) -> Dict[str, Any]:
    """
    Authenticates a user and issues a signed JWT access token.
    Generic error messaging prevents user enumeration attacks.
    Logs every attempt to data/user_logs.txt with [REDACTED] password.
    """
    # 1. Normalize email
    normalized = normalize_email(req.email) if req.email else ""

    # 2. Lookup user to resolve saved username
    async with db.execute(
        "SELECT id, name, email, password_hash, role, is_verified, account_status FROM users WHERE email = ?",
        (normalized,)
    ) as cursor:
        user = await cursor.fetchone()

    saved_as_username = user["name"] if (user and user["name"]) else (user["email"] if user else "UNKNOWN")

    # 3. Check brute force protection
    try:
        await check_login_rate_limit(db, ip_address, req.email)
    except HTTPException:
        log_user_login_attempt(
            entered_username=req.email,
            saved_as_username=saved_as_username,
            ip_address=ip_address
        )
        raise

    # 4. Verify password
    if not user or not verify_password(req.password, user["password_hash"]):
        log_user_login_attempt(
            entered_username=req.email,
            saved_as_username=saved_as_username,
            ip_address=ip_address
        )
        await record_login_attempt(db, ip_address, normalized, success=False)
        await record_audit_log(
            db,
            event_type="LOGIN_FAILED",
            email=normalized,
            ip_address=ip_address,
            user_agent=user_agent,
            details="Invalid credentials provided."
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    # 5. Check account status
    if user["account_status"] != "active":
        log_user_login_attempt(
            entered_username=req.email,
            saved_as_username=saved_as_username,
            ip_address=ip_address
        )
        await record_login_attempt(db, ip_address, normalized, success=False)
        await record_audit_log(
            db,
            event_type="LOGIN_REJECTED",
            user_id=user["id"],
            email=normalized,
            ip_address=ip_address,
            user_agent=user_agent,
            details="Attempted login on suspended account."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended. Please contact the administrator."
        )

    # 6. Record successful login to data/user_logs.txt
    log_user_login_attempt(
        entered_username=req.email,
        saved_as_username=saved_as_username,
        ip_address=ip_address
    )
    await record_login_attempt(db, ip_address, normalized, success=True)
    await db.execute(
        "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
        (user["id"],)
    )
    await db.commit()

    # 7. Generate JWT access token
    token = create_access_token(
        user_id=user["id"],
        email=user["email"],
        role=user["role"]
    )

    # 8. Record audit log
    await record_audit_log(
        db,
        event_type="LOGIN_SUCCESS",
        user_id=user["id"],
        email=normalized,
        ip_address=ip_address,
        user_agent=user_agent,
        details="User logged in successfully."
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "is_verified": bool(user["is_verified"]),
            "account_status": user["account_status"]
        }
    }


# ---------------------------------------------------------------------------
# Email Verification & Password Recovery
# ---------------------------------------------------------------------------

async def verify_email_token(
    db: aiosqlite.Connection,
    raw_token: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, str]:
    """Validates an email verification token and marks account as verified."""
    t_hash = hash_token(raw_token)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    async with db.execute(
        """
        SELECT id, user_id, expires_at, used_at
        FROM verification_tokens
        WHERE token_hash = ? AND token_type = 'email_verify'
        """,
        (t_hash,)
    ) as cursor:
        token_record = await cursor.fetchone()

    if not token_record or token_record["used_at"] is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired email verification link."
        )

    if token_record["expires_at"] < now_iso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification link has expired. Please request a new verification email."
        )

    # Mark user verified and token used
    await db.execute("UPDATE users SET is_verified = 1 WHERE id = ?", (token_record["user_id"],))
    await db.execute("UPDATE verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?", (token_record["id"],))
    await db.commit()

    await record_audit_log(
        db,
        event_type="EMAIL_VERIFIED",
        user_id=token_record["user_id"],
        ip_address=ip_address,
        user_agent=user_agent,
        details="Client email verified successfully."
    )

    return {"message": "Email address verified successfully. You may now access all surveillance features."}


async def request_password_reset(
    db: aiosqlite.Connection,
    email: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, str]:
    """
    Initiates password recovery.
    Always returns a generic confirmation message to prevent account enumeration.
    """
    normalized = normalize_email(email)

    async with db.execute(
        "SELECT id, name, email, account_status FROM users WHERE email = ?",
        (normalized,)
    ) as cursor:
        user = await cursor.fetchone()

    if user and user["account_status"] == "active":
        # Invalidate any existing unused reset tokens for this user
        await db.execute(
            """
            UPDATE verification_tokens
            SET used_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND token_type = 'password_reset' AND used_at IS NULL
            """,
            (user["id"],)
        )

        raw_token, token_hash = generate_single_use_token()
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)).strftime("%Y-%m-%d %H:%M:%S")

        await db.execute(
            """
            INSERT INTO verification_tokens (user_id, token_hash, token_type, expires_at)
            VALUES (?, ?, 'password_reset', ?)
            """,
            (user["id"], token_hash, expires_at)
        )
        await db.commit()

        await email_service.send_password_reset_email(
            email=normalized,
            name=user["name"],
            token=raw_token
        )

        await record_audit_log(
            db,
            event_type="PASSWORD_RESET_REQUESTED",
            user_id=user["id"],
            email=normalized,
            ip_address=ip_address,
            user_agent=user_agent,
            details="Password reset token issued."
        )

    # Return identical generic message regardless of user existence
    return {
        "message": "If this email is associated with a RAVEN account, instructions to reset your password have been sent."
    }


async def reset_password_with_token(
    db: aiosqlite.Connection,
    req: ResetPasswordRequest,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, str]:
    """Verifies single-use reset token and securely sets a new Argon2id password hash."""
    valid_pw, pw_err = validate_password_strength(req.new_password)
    if not valid_pw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_err)

    t_hash = hash_token(req.token)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    async with db.execute(
        """
        SELECT id, user_id, expires_at, used_at
        FROM verification_tokens
        WHERE token_hash = ? AND token_type = 'password_reset'
        """,
        (t_hash,)
    ) as cursor:
        token_record = await cursor.fetchone()

    if not token_record or token_record["used_at"] is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link."
        )

    if token_record["expires_at"] < now_iso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link has expired. Please submit a new reset request."
        )

    new_hash = hash_password(req.new_password)

    # Update password and mark token used
    await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, token_record["user_id"]))
    await db.execute("UPDATE verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?", (token_record["id"],))
    await db.commit()

    await record_audit_log(
        db,
        event_type="PASSWORD_RESET_SUCCESS",
        user_id=token_record["user_id"],
        ip_address=ip_address,
        user_agent=user_agent,
        details="User password reset completed."
    )

    return {"message": "Your password has been successfully reset. Please log in with your new credentials."}


async def change_user_password(
    db: aiosqlite.Connection,
    user_id: str,
    req: ChangePasswordRequest,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, str]:
    """Allows an authenticated user to update their password after verifying their current password."""
    async with db.execute("SELECT password_hash, email FROM users WHERE id = ?", (user_id,)) as cursor:
        user = await cursor.fetchone()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if not verify_password(req.current_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")

    valid_pw, pw_err = validate_password_strength(req.new_password)
    if not valid_pw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=pw_err)

    new_hash = hash_password(req.new_password)
    await db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user_id))
    await db.commit()

    await record_audit_log(
        db,
        event_type="PASSWORD_CHANGED",
        user_id=user_id,
        email=user["email"],
        ip_address=ip_address,
        user_agent=user_agent,
        details="User changed password from account settings."
    )

    return {"message": "Password changed successfully."}


async def revoke_user_token(
    db: aiosqlite.Connection,
    jti: str,
    user_id: str,
    exp: int
) -> None:
    """Blacklists a JWT jti upon user logout."""
    exp_iso = datetime.fromtimestamp(exp, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    await db.execute(
        """
        INSERT OR IGNORE INTO revoked_tokens (jti, user_id, expires_at)
        VALUES (?, ?, ?)
        """,
        (jti, user_id, exp_iso)
    )
    await db.commit()


# ---------------------------------------------------------------------------
# Client Data Isolation (Workspaces & Reports)
# ---------------------------------------------------------------------------

async def list_client_reports(
    db: aiosqlite.Connection,
    user_id: str,
    is_admin: bool = False
) -> List[Dict[str, Any]]:
    """
    Returns reports scoped strictly to the authenticated user.
    Administrators may view all reports when authorized.
    """
    if is_admin:
        query = "SELECT * FROM client_reports ORDER BY created_at DESC"
        params = ()
    else:
        query = "SELECT * FROM client_reports WHERE user_id = ? ORDER BY created_at DESC"
        params = (user_id,)

    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def create_client_report(
    db: aiosqlite.Connection,
    user_id: str,
    req: ClientReportCreate
) -> Dict[str, Any]:
    """Creates a new surveillance audit report bound permanently to the client's user_id."""
    report_id = str(uuid.uuid4())
    await db.execute(
        """
        INSERT INTO client_reports (
            id, user_id, title, duration_seconds, frames_processed, average_fps,
            average_latency_ms, total_unique_tracks, detector, validator,
            ensemble_alpha, ensemble_threshold, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            report_id, user_id, req.title, req.duration_seconds, req.frames_processed,
            req.average_fps, req.average_latency_ms, req.total_unique_tracks,
            req.detector, req.validator, req.ensemble_alpha, req.ensemble_threshold, req.notes
        )
    )
    await db.commit()

    async with db.execute("SELECT * FROM client_reports WHERE id = ?", (report_id,)) as cursor:
        created = await cursor.fetchone()
        return dict(created)


async def get_client_report_by_id(
    db: aiosqlite.Connection,
    user_id: str,
    report_id: str,
    is_admin: bool = False
) -> Dict[str, Any]:
    """
    Enforces strict client ownership verification.
    Rejects unauthorized access even if the requester manually guesses or provides another client's report ID.
    """
    async with db.execute("SELECT * FROM client_reports WHERE id = ?", (report_id,)) as cursor:
        report = await cursor.fetchone()

    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    # Strictly reject cross-tenant access
    if report["user_id"] != user_id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You do not have permission to view another client's report."
        )

    return dict(report)


async def delete_client_report(
    db: aiosqlite.Connection,
    user_id: str,
    report_id: str,
    is_admin: bool = False
) -> Dict[str, str]:
    """Deletes a report with verified ownership."""
    # Enforce ownership check first
    await get_client_report_by_id(db, user_id, report_id, is_admin)

    await db.execute("DELETE FROM client_reports WHERE id = ?", (report_id,))
    await db.commit()
    return {"message": "Report deleted successfully."}


async def get_client_config(
    db: aiosqlite.Connection,
    user_id: str
) -> Dict[str, Any]:
    """Retrieves client-specific workspace settings."""
    async with db.execute("SELECT * FROM client_configs WHERE user_id = ?", (user_id,)) as cursor:
        cfg = await cursor.fetchone()
        if not cfg:
            # Create default config if missing
            await db.execute(
                """
                INSERT INTO client_configs (user_id, workspace_name, ensemble_alpha, ensemble_threshold)
                VALUES (?, 'Primary Workspace', ?, ?)
                """,
                (user_id, settings.ENSEMBLE_ALPHA, settings.ENSEMBLE_ACCEPT_THRESHOLD)
            )
            await db.commit()
            async with db.execute("SELECT * FROM client_configs WHERE user_id = ?", (user_id,)) as c2:
                cfg = await c2.fetchone()
        return dict(cfg)


async def update_client_config(
    db: aiosqlite.Connection,
    user_id: str,
    req: ClientConfigUpdate
) -> Dict[str, Any]:
    """Updates client-specific workspace configuration."""
    cfg = await get_client_config(db, user_id)

    new_name = req.workspace_name if req.workspace_name is not None else cfg["workspace_name"]
    new_alpha = req.ensemble_alpha if req.ensemble_alpha is not None else cfg["ensemble_alpha"]
    new_thresh = req.ensemble_threshold if req.ensemble_threshold is not None else cfg["ensemble_threshold"]
    new_bound = req.boundary_ratio if req.boundary_ratio is not None else cfg["boundary_ratio"]
    new_kp_pan = req.kp_pan if req.kp_pan is not None else cfg["kp_pan"]
    new_kp_tilt = req.kp_tilt if req.kp_tilt is not None else cfg["kp_tilt"]

    await db.execute(
        """
        UPDATE client_configs
        SET workspace_name = ?, ensemble_alpha = ?, ensemble_threshold = ?,
            boundary_ratio = ?, kp_pan = ?, kp_tilt = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
        """,
        (new_name, new_alpha, new_thresh, new_bound, new_kp_pan, new_kp_tilt, user_id)
    )
    await db.commit()
    return await get_client_config(db, user_id)


# ---------------------------------------------------------------------------
# Admin Management Operations
# ---------------------------------------------------------------------------

async def get_admin_user_stats(db: aiosqlite.Connection) -> Dict[str, int]:
    """Gathers aggregate account statistics for the administrative dashboard."""
    async with db.execute(
        """
        SELECT
            COUNT(*) as total_users,
            SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
            SUM(CASE WHEN is_verified = 0 THEN 1 ELSE 0 END) as unverified_users,
            SUM(CASE WHEN account_status = 'active' THEN 1 ELSE 0 END) as active_users,
            SUM(CASE WHEN account_status = 'suspended' THEN 1 ELSE 0 END) as suspended_users,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users,
            SUM(CASE WHEN role = 'client' THEN 1 ELSE 0 END) as client_users
        FROM users
        """
    ) as cursor:
        row = await cursor.fetchone()
        return {
            "total_users": row["total_users"] or 0,
            "verified_users": row["verified_users"] or 0,
            "unverified_users": row["unverified_users"] or 0,
            "active_users": row["active_users"] or 0,
            "suspended_users": row["suspended_users"] or 0,
            "admin_users": row["admin_users"] or 0,
            "client_users": row["client_users"] or 0
        }


async def list_admin_users(
    db: aiosqlite.Connection,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Lists registered accounts with filters. Never exposes password hashes or tokens."""
    query = "SELECT id, name, email, role, is_verified, account_status, created_at, last_login_at FROM users WHERE 1=1"
    params: List[Any] = []

    if search:
        query += " AND (name LIKE ? OR email LIKE ?)"
        s_term = f"%{search.strip()}%"
        params.extend([s_term, s_term])

    if role:
        query += " AND role = ?"
        params.append(role)

    if status_filter:
        query += " AND account_status = ?"
        params.append(status_filter)

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    async with db.execute(query, params) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def update_user_status_by_admin(
    db: aiosqlite.Connection,
    target_user_id: str,
    new_status: str,
    admin_id: str,
    ip_address: Optional[str] = None
) -> Dict[str, str]:
    """Suspends or activates a client account with audit logging."""
    async with db.execute("SELECT id, email, role FROM users WHERE id = ?", (target_user_id,)) as cursor:
        target = await cursor.fetchone()
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if target_user_id == admin_id and new_status == "suspended":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrators cannot suspend their own account.")

    await db.execute("UPDATE users SET account_status = ? WHERE id = ?", (new_status, target_user_id))
    await db.commit()

    await record_audit_log(
        db,
        event_type="ACCOUNT_STATUS_CHANGE",
        user_id=target_user_id,
        email=target["email"],
        ip_address=ip_address,
        details=f"Status updated to '{new_status}' by administrator ID {admin_id}."
    )

    return {"message": f"User status updated to '{new_status}'."}


async def update_user_role_by_admin(
    db: aiosqlite.Connection,
    target_user_id: str,
    new_role: str,
    admin_id: str,
    ip_address: Optional[str] = None
) -> Dict[str, str]:
    """Promotes or demotes an account role with audit trail."""
    async with db.execute("SELECT id, email, role FROM users WHERE id = ?", (target_user_id,)) as cursor:
        target = await cursor.fetchone()
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if target_user_id == admin_id and new_role != "admin":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrators cannot remove their own administrator role.")

    await db.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, target_user_id))
    await db.commit()

    await record_audit_log(
        db,
        event_type="ROLE_CHANGE",
        user_id=target_user_id,
        email=target["email"],
        ip_address=ip_address,
        details=f"Role changed from '{target['role']}' to '{new_role}' by administrator ID {admin_id}."
    )

    return {"message": f"User role updated to '{new_role}'."}


async def list_security_audit_logs(
    db: aiosqlite.Connection,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Retrieves recent security audit records for administrative review."""
    async with db.execute(
        """
        SELECT id, timestamp, user_id, email, event_type, ip_address, user_agent, details
        FROM security_audit_logs
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
        """,
        (limit, offset)
    ) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
