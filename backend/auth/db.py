"""
RAVEN Authentication & Client Workspace Database Engine
Provides schema management, migrations, and asynchronous connection handling.
"""

from pathlib import Path
from typing import Optional
import aiosqlite
from backend.config import settings

AUTH_SCHEMA_SQL = """
-- Users table: stores core identity with normalized unique email and Argon2id hash
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    is_verified INTEGER NOT NULL DEFAULT 0,
    account_status TEXT NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Single-use verification and password reset tokens (hashed with SHA-256)
CREATE TABLE IF NOT EXISTS verification_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    token_type TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tokens_hash ON verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON verification_tokens(user_id);

-- Token revocation list (JWT jti blacklisting upon logout or password reset)
CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    revoked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL
);

-- Comprehensive security audit ledger
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id TEXT,
    email TEXT,
    event_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_event ON security_audit_logs(event_type);

-- Login rate limiting / brute-force tracker
CREATE TABLE IF NOT EXISTS login_rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    email TEXT,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON login_rate_limits(ip_address, attempted_at);

-- Client-isolated reports: strictly scoped per user_id
CREATE TABLE IF NOT EXISTS client_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    duration_seconds REAL NOT NULL,
    frames_processed INTEGER NOT NULL,
    average_fps REAL NOT NULL,
    average_latency_ms REAL NOT NULL,
    total_unique_tracks INTEGER NOT NULL,
    detector TEXT NOT NULL,
    validator TEXT NOT NULL,
    ensemble_alpha REAL NOT NULL,
    ensemble_threshold REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_user_id ON client_reports(user_id);

-- Client-isolated workspace configurations: strictly scoped per user_id
CREATE TABLE IF NOT EXISTS client_configs (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    workspace_name TEXT DEFAULT 'Primary Workspace',
    ensemble_alpha REAL DEFAULT 0.70,
    ensemble_threshold REAL DEFAULT 0.50,
    boundary_ratio REAL DEFAULT 0.10,
    kp_pan REAL DEFAULT 0.40,
    kp_tilt REAL DEFAULT 0.40,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""


class AuthDatabaseManager:
    """Manages SQLite tables and connection pooling for authentication and client isolation."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or getattr(settings, "AUTH_DATABASE_PATH", settings.DATABASE_PATH)
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

    async def init_auth_db(self) -> None:
        """Applies schema migrations idempotently without resetting existing data."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript(AUTH_SCHEMA_SQL)
            await db.commit()

    async def get_connection(self) -> aiosqlite.Connection:
        """Provides an asynchronous database connection with row factory enabled."""
        conn = await aiosqlite.connect(self.db_path)
        conn.row_factory = aiosqlite.Row
        return conn


auth_db = AuthDatabaseManager()
