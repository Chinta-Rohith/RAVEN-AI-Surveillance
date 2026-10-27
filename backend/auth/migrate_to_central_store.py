"""
RAVEN Centralized Account Storage Migration Utility
Migrates user account records and client workspaces to the centralized data/users.db store.
Preserves existing Argon2id password hashes without exposing or writing plain-text passwords.
"""

import sys
import sqlite3
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT_DIR / "data"
TARGET_DB = DATA_DIR / "users.db"
SOURCE_DB = ROOT_DIR / "logs" / "raven_telemetry.db"


def run_migration():
    print(f"[RAVEN Migration] Initiating account migration to central store...")
    print(f"  Target DB: {TARGET_DB}")
    print(f"  Source DB: {SOURCE_DB}")

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Initialize Schema in target DB
    from backend.auth.db import AUTH_SCHEMA_SQL
    with sqlite3.connect(TARGET_DB) as target_conn:
        target_conn.executescript(AUTH_SCHEMA_SQL)
        target_conn.commit()

    if not SOURCE_DB.exists():
        print(f"[RAVEN Migration] Source DB {SOURCE_DB} does not exist. Initialized fresh schema at {TARGET_DB}.")
        return

    # 2. Safely migrate tables from Source to Target
    with sqlite3.connect(SOURCE_DB) as src_conn, sqlite3.connect(TARGET_DB) as dst_conn:
        src_conn.row_factory = sqlite3.Row
        dst_cursor = dst_conn.cursor()

        # Migrate Users
        try:
            users = src_conn.execute("SELECT id, name, email, password_hash, role, is_verified, account_status, created_at, last_login_at FROM users").fetchall()
            migrated_users = 0
            for u in users:
                dst_cursor.execute(
                    """
                    INSERT INTO users (id, name, email, password_hash, role, is_verified, account_status, created_at, last_login_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(email) DO UPDATE SET
                        name=excluded.name,
                        password_hash=excluded.password_hash,
                        role=excluded.role,
                        is_verified=excluded.is_verified,
                        account_status=excluded.account_status,
                        last_login_at=excluded.last_login_at
                    """,
                    (u["id"], u["name"], u["email"], u["password_hash"], u["role"], u["is_verified"], u["account_status"], u["created_at"], u["last_login_at"])
                )
                migrated_users += 1
            print(f"[RAVEN Migration] Successfully migrated {migrated_users} user accounts (Argon2id hashes preserved).")
        except sqlite3.OperationalError as e:
            print(f"[RAVEN Migration] Notice on users table: {e}")

        # Migrate Client Configs
        try:
            configs = src_conn.execute("SELECT user_id, workspace_name, ensemble_alpha, ensemble_threshold, boundary_ratio, kp_pan, kp_tilt, updated_at FROM client_configs").fetchall()
            for c in configs:
                dst_cursor.execute(
                    """
                    INSERT INTO client_configs (user_id, workspace_name, ensemble_alpha, ensemble_threshold, boundary_ratio, kp_pan, kp_tilt, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(user_id) DO UPDATE SET
                        workspace_name=excluded.workspace_name,
                        ensemble_alpha=excluded.ensemble_alpha,
                        ensemble_threshold=excluded.ensemble_threshold,
                        boundary_ratio=excluded.boundary_ratio,
                        kp_pan=excluded.kp_pan,
                        kp_tilt=excluded.kp_tilt,
                        updated_at=excluded.updated_at
                    """,
                    (c["user_id"], c["workspace_name"], c["ensemble_alpha"], c["ensemble_threshold"], c["boundary_ratio"], c["kp_pan"], c["kp_tilt"], c["updated_at"])
                )
            print(f"[RAVEN Migration] Successfully migrated {len(configs)} client configurations.")
        except sqlite3.OperationalError as e:
            print(f"[RAVEN Migration] Notice on client_configs table: {e}")

        # Migrate Client Reports
        try:
            reports = src_conn.execute("SELECT id, user_id, title, duration_seconds, frames_processed, average_fps, average_latency_ms, total_unique_tracks, detector, validator, ensemble_alpha, ensemble_threshold, notes, created_at FROM client_reports").fetchall()
            for r in reports:
                dst_cursor.execute(
                    """
                    INSERT INTO client_reports (id, user_id, title, duration_seconds, frames_processed, average_fps, average_latency_ms, total_unique_tracks, detector, validator, ensemble_alpha, ensemble_threshold, notes, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO NOTHING
                    """,
                    tuple(r)
                )
            print(f"[RAVEN Migration] Successfully migrated {len(reports)} client surveillance reports.")
        except sqlite3.OperationalError as e:
            print(f"[RAVEN Migration] Notice on client_reports table: {e}")

        # Migrate Security Audit Logs
        try:
            logs = src_conn.execute("SELECT id, timestamp, user_id, email, event_type, ip_address, user_agent, details FROM security_audit_logs").fetchall()
            for l in logs:
                dst_cursor.execute(
                    """
                    INSERT INTO security_audit_logs (id, timestamp, user_id, email, event_type, ip_address, user_agent, details)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO NOTHING
                    """,
                    tuple(l)
                )
            print(f"[RAVEN Migration] Successfully migrated {len(logs)} security audit log entries.")
        except sqlite3.OperationalError as e:
            print(f"[RAVEN Migration] Notice on security_audit_logs table: {e}")

        # Migrate Revoked Tokens
        try:
            tokens = src_conn.execute("SELECT jti, user_id, revoked_at, expires_at FROM revoked_tokens").fetchall()
            for t in tokens:
                dst_cursor.execute(
                    """
                    INSERT INTO revoked_tokens (jti, user_id, revoked_at, expires_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(jti) DO NOTHING
                    """,
                    tuple(t)
                )
        except sqlite3.OperationalError:
            pass

        dst_conn.commit()

    print("[RAVEN Migration] Migration to centralized store 'data/users.db' complete. Original database preserved.")


if __name__ == "__main__":
    run_migration()
