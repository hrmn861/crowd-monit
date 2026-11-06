"""
Authentication & JWT Security Utilities for Crowd Monitor.
Provides secure password hashing (PBKDF2-HMAC-SHA256) and JWT token creation/verification.
Supports both Bearer headers and HttpOnly cookies.
"""

import os
import hmac
import base64
import json
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "crowd-monitor-production-super-secret-jwt-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7-day token for control room operators

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# ----------------------------------------------------------------------------
# 1. Cryptographic Password Hashing (Salted PBKDF2-SHA256)
# ----------------------------------------------------------------------------
def hash_password(password: str) -> str:
    """Hashes password with a random 16-byte salt using 100,000 PBKDF2-HMAC-SHA256 rounds."""
    salt = secrets.token_bytes(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    # Format: algorithm$salt_hex$key_hex
    return f"pbkdf2_sha256${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored salted hash."""
    try:
        if not hashed_password or "$" not in hashed_password:
            return False
        parts = hashed_password.split("$")
        if len(parts) == 3 and parts[0] == "pbkdf2_sha256":
            salt = bytes.fromhex(parts[1])
            expected_key = bytes.fromhex(parts[2])
            candidate_key = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, 100000)
            return hmac.compare_digest(candidate_key, expected_key)
        # Fallback for plain bcrypt if already hashed by passlib
        try:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            return False
    except Exception:
        return False


# ----------------------------------------------------------------------------
# 2. JWT Encoding and Decoding
# ----------------------------------------------------------------------------
def _b64encode_url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64decode_url(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed HS256 JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})

    header = {"alg": ALGORITHM, "typ": "JWT"}
    header_b64 = _b64encode_url(json.dumps(header).encode("utf-8"))
    payload_b64 = _b64encode_url(json.dumps(to_encode).encode("utf-8"))
    signature_data = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signature_data, hashlib.sha256).digest()
    sig_b64 = _b64encode_url(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Dict[str, Any]:
    """Validates and decodes a signed HS256 JWT access token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token structure")

        header_b64, payload_b64, sig_b64 = parts
        signature_data = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), signature_data, hashlib.sha256).digest()
        provided_sig = _b64decode_url(sig_b64)

        if not hmac.compare_digest(expected_sig, provided_sig):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")

        payload = json.loads(_b64decode_url(payload_b64).decode("utf-8"))
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")

        return payload
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token validation failed: {str(e)}")


# ----------------------------------------------------------------------------
# 3. Authentication Dependency
# ----------------------------------------------------------------------------
def get_current_user_optional(request: Request, token: Optional[str] = Depends(oauth2_scheme)) -> Optional[Dict[str, Any]]:
    """Returns token payload if valid Bearer token or HttpOnly cookie provided, otherwise None."""
    auth_token = token or request.cookies.get("access_token")
    if not auth_token:
        return None
    try:
        return decode_access_token(auth_token)
    except Exception:
        return None


def get_current_user(request: Request, token: Optional[str] = Depends(oauth2_scheme)) -> Dict[str, Any]:
    """Requires valid JWT Bearer token or HttpOnly cookie."""
    auth_token = token or request.cookies.get("access_token")
    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer JWT token or login cookie.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(auth_token)


def require_role(allowed_roles: list[str]):
    """
    FastAPI dependency factory enforcing Role-Based Access Control (RBAC).
    Normalizes roles to uppercase (e.g. 'ADMIN', 'OPERATOR', 'ANALYST')
    and validates the current authenticated user's token payload.
    """
    normalized_allowed = [r.strip().upper() for r in allowed_roles]

    def _role_checker(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        user_role = str(current_user.get("role", "")).strip().upper()
        # Also treat 'SUPERVISOR' as OPERATOR/ADMIN tier if legacy token
        if user_role == "SUPERVISOR":
            user_role = "OPERATOR"

        if user_role not in normalized_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Access denied. Required role in {normalized_allowed}, but user has role '{user_role}'."
            )
        return current_user

    return _role_checker
