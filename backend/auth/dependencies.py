"""
RAVEN Authentication Dependencies
Provides FastAPI request dependencies for authentication, RBAC, and database connections.
"""

from typing import Optional, Dict, Any, AsyncGenerator
import aiosqlite
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from backend.auth.db import auth_db
from backend.auth.security import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Yields a database connection with clean resource management."""
    conn = await auth_db.get_connection()
    try:
        yield conn
    finally:
        await conn.close()


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: aiosqlite.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """
    Extracts, verifies, and authenticates the requesting user.
    Supports Authorization Bearer header or fallback HTTP-only access_token cookie.
    """
    token: Optional[str] = None
    if credentials:
        token = credentials.credentials
    elif "access_token" in request.cookies:
        token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    jti = payload.get("jti")

    # Check token revocation list (e.g. user logged out or changed password)
    if jti:
        async with db.execute("SELECT 1 FROM revoked_tokens WHERE jti = ?", (jti,)) as cursor:
            revoked = await cursor.fetchone()
            if revoked:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication session has been revoked. Please log in again.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # Fetch active user from database
    async with db.execute(
        "SELECT id, name, email, role, is_verified, account_status, created_at, last_login_at FROM users WHERE id = ?",
        (user_id,)
    ) as cursor:
        user = await cursor.fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user["account_status"] != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been suspended. Please contact system administrator."
        )

    user_dict = dict(user)
    user_dict["jti"] = jti
    user_dict["exp"] = payload.get("exp")
    return user_dict


async def get_current_admin(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Role-Based Access Control gate: strictly requires 'admin' role.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required to access this resource."
        )
    return current_user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: aiosqlite.Connection = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Provides optional user context for public endpoints that adapt behavior when authenticated.
    """
    try:
        return await get_current_user(request, credentials, db)
    except HTTPException:
        return None
