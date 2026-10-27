"""
RAVEN Authentication & Client Workspace API Router
Implements secure endpoints for identity lifecycle, client data isolation, and admin control.
"""

from typing import List, Optional
import aiosqlite
from fastapi import APIRouter, Depends, Request, Response, status, Query

from backend.auth.dependencies import (
    get_db,
    get_current_user,
    get_current_admin
)
from backend.auth.schemas import (
    UserRegisterRequest,
    UserLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    ChangePasswordRequest,
    UpdateProfileRequest,
    UserResponse,
    TokenResponse,
    AdminUserUpdateRequest,
    AdminStatsResponse,
    AuditLogResponse,
    ClientReportCreate,
    ClientReportResponse,
    ClientConfigUpdate,
    ClientConfigResponse
)
from backend.auth import service

auth_router = APIRouter(prefix="/api/auth", tags=["Authentication"])
client_router = APIRouter(prefix="/api/client", tags=["Client Workspace"])
admin_router = APIRouter(prefix="/api/admin", tags=["Administration"])


# ---------------------------------------------------------------------------
# Authentication Endpoints
# ---------------------------------------------------------------------------

@auth_router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    req: UserRegisterRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Public registration endpoint.
    Always assigns the least privileged 'client' role. Never allows public admin creation.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "UNKNOWN"
    user_agent = request.headers.get("user-agent", "unknown")
    user = await service.register_user(db, req, ip_address=client_ip, user_agent=user_agent)
    return user


@auth_router.post("/login", response_model=TokenResponse)
async def login(
    req: UserLoginRequest,
    request: Request,
    response: Response,
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Authenticates client or administrator credentials.
    Enforces brute-force rate-limiting and issues a cryptographically signed JWT.
    Also sets a secure HTTP-only cookie.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "UNKNOWN"
    user_agent = request.headers.get("user-agent", "unknown")
    result = await service.login_user(db, req, ip_address=client_ip, user_agent=user_agent)

    # Set secure HTTP-only cookie for enhanced browser defense
    response.set_cookie(
        key="access_token",
        value=result["access_token"],
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production with HTTPS
        max_age=3600
    )

    return result


@auth_router.post("/logout")
async def logout(
    response: Response,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Revokes the current user's session token and clears browser cookies.
    """
    jti = current_user.get("jti")
    exp = current_user.get("exp") or 0
    if jti:
        await service.revoke_user_token(db, jti, current_user["id"], exp)

    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully."}


@auth_router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Returns the verified profile of the currently authenticated user."""
    return current_user


@auth_router.put("/profile", response_model=UserResponse)
async def update_profile(
    req: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Updates user display name."""
    await db.execute("UPDATE users SET name = ? WHERE id = ?", (req.name.strip(), current_user["id"]))
    await db.commit()
    current_user["name"] = req.name.strip()
    return current_user


@auth_router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Allows an authenticated user to update their password."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "UNKNOWN"
    user_agent = request.headers.get("user-agent", "unknown")
    return await service.change_user_password(db, current_user["id"], req, ip_address=client_ip, user_agent=user_agent)


@auth_router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Requests a password reset link.
    Returns a generic message regardless of email existence to prevent user enumeration.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "UNKNOWN"
    user_agent = request.headers.get("user-agent", "unknown")
    return await service.request_password_reset(db, req.email, ip_address=client_ip, user_agent=user_agent)


@auth_router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Resets password using a verified single-use token."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "UNKNOWN"
    user_agent = request.headers.get("user-agent", "unknown")
    return await service.reset_password_with_token(db, req, ip_address=client_ip, user_agent=user_agent)


@auth_router.post("/verify-email")
async def verify_email(
    req: VerifyEmailRequest,
    request: Request,
    db: aiosqlite.Connection = Depends(get_db)
):
    """Verifies user email address using single-use verification token."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    elif request.client and request.client.host:
        client_ip = request.client.host
    else:
        client_ip = "UNKNOWN"
    user_agent = request.headers.get("user-agent", "unknown")
    return await service.verify_email_token(db, req.token, ip_address=client_ip, user_agent=user_agent)


# ---------------------------------------------------------------------------
# Client Data Isolation Endpoints (Workspace & Saved Reports)
# ---------------------------------------------------------------------------

@client_router.get("/reports", response_model=List[ClientReportResponse])
async def get_my_reports(
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Returns only reports created by and belonging to the authenticated client.
    Cross-client records are strictly hidden.
    """
    is_admin = current_user.get("role") == "admin"
    return await service.list_client_reports(db, user_id=current_user["id"], is_admin=is_admin)


@client_router.post("/reports", response_model=ClientReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    req: ClientReportCreate,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Creates a new report bound strictly to the authenticated user's workspace."""
    return await service.create_client_report(db, user_id=current_user["id"], req=req)


@client_router.get("/reports/{report_id}", response_model=ClientReportResponse)
async def get_report_by_id(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """
    Retrieves a single report with strict ownership check.
    Rejects unauthorized access with 403 Forbidden if Client A requests Client B's report.
    """
    is_admin = current_user.get("role") == "admin"
    return await service.get_client_report_by_id(db, user_id=current_user["id"], report_id=report_id, is_admin=is_admin)


@client_router.delete("/reports/{report_id}")
async def delete_report(
    report_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Deletes a report with verified ownership."""
    is_admin = current_user.get("role") == "admin"
    return await service.delete_client_report(db, user_id=current_user["id"], report_id=report_id, is_admin=is_admin)


@client_router.get("/config", response_model=ClientConfigResponse)
async def get_my_config(
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Retrieves client-specific isolated workspace settings."""
    return await service.get_client_config(db, user_id=current_user["id"])


@client_router.put("/config", response_model=ClientConfigResponse)
async def update_my_config(
    req: ClientConfigUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Updates client-specific isolated workspace settings."""
    return await service.update_client_config(db, user_id=current_user["id"], req=req)


# ---------------------------------------------------------------------------
# Administrator Control Endpoints (Protected by RBAC)
# ---------------------------------------------------------------------------

@admin_router.get("/stats", response_model=AdminStatsResponse)
async def admin_get_stats(
    _: dict = Depends(get_current_admin),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Aggregates user, verification, and role metrics for administrative overview."""
    return await service.get_admin_user_stats(db)


@admin_router.get("/users", response_model=List[UserResponse])
async def admin_list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    _: dict = Depends(get_current_admin),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Lists registered user accounts. Sensitive hashes and tokens are strictly excluded."""
    return await service.list_admin_users(
        db, search=search, role=role, status_filter=status_filter, limit=limit, offset=offset
    )


@admin_router.patch("/users/{user_id}/status")
async def admin_update_user_status(
    user_id: str,
    req: AdminUserUpdateRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Suspends or reactivates a user account with audit logging."""
    if not req.account_status:
        return {"message": "No status change specified."}
    client_ip = request.client.host if request.client else "unknown"
    return await service.update_user_status_by_admin(
        db, target_user_id=user_id, new_status=req.account_status, admin_id=current_admin["id"], ip_address=client_ip
    )


@admin_router.patch("/users/{user_id}/role")
async def admin_update_user_role(
    user_id: str,
    req: AdminUserUpdateRequest,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Promotes or demotes an account role with audit logging."""
    if not req.role:
        return {"message": "No role change specified."}
    client_ip = request.client.host if request.client else "unknown"
    return await service.update_user_role_by_admin(
        db, target_user_id=user_id, new_role=req.role, admin_id=current_admin["id"], ip_address=client_ip
    )


@admin_router.get("/audit-logs", response_model=List[AuditLogResponse])
async def admin_get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    _: dict = Depends(get_current_admin),
    db: aiosqlite.Connection = Depends(get_db)
):
    """Retrieves immutable security audit logs for compliance and incident inspection."""
    return await service.list_security_audit_logs(db, limit=limit, offset=offset)
