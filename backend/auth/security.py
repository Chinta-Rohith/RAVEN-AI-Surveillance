"""
RAVEN Security Module
Implements Argon2id password hashing, JWT generation, and cryptographic tokens.
"""

import uuid
import secrets
import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

from backend.config import settings

# Argon2id password hasher with secure parameters (OWASP recommended)
# time_cost=2, memory_cost=102400 (100MB), parallelism=8
_ph = PasswordHasher(
    time_cost=2,
    memory_cost=102400,
    parallelism=8,
    hash_len=32,
    salt_len=16
)


def hash_password(password: str) -> str:
    """Hashes a plain-text password using Argon2id."""
    return _ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against an Argon2id hash."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def validate_password_strength(password: str) -> tuple[bool, Optional[str]]:
    """
    Validates password strength according to enterprise security standards:
    - Minimum 8 characters
    - At least one letter
    - At least one digit or special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    if not re.search(r"[A-Za-z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"[\d\W_]", password):
        return False, "Password must contain at least one digit or symbol."
    return True, None


def normalize_email(email: str) -> str:
    """Normalizes an email address to lowercase and trimmed format."""
    return email.strip().lower()


def create_access_token(
    user_id: str,
    email: str,
    role: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Generates a cryptographically signed JWT with jti for revocation support.
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": user_id,
        "email": email,
        "role": role,
        "jti": str(uuid.uuid4()),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": "raven-surveillance"
    }

    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decodes and validates a signed JWT. Returns None on signature mismatch or expiration.
    """
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer="raven-surveillance"
        )
    except jwt.PyJWTError:
        return None


def generate_single_use_token() -> tuple[str, str]:
    """
    Generates a secure, random urlsafe token for email verification or password reset.
    Returns:
        (raw_token, token_hash)
    The raw_token is sent to the client/email, and only token_hash is stored in the database.
    """
    raw_token = secrets.token_urlsafe(32)
    token_hash = hash_token(raw_token)
    return raw_token, token_hash


def hash_token(raw_token: str) -> str:
    """Computes a SHA-256 hash of a single-use token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
