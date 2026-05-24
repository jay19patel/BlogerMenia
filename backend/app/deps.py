"""
FastAPI dependencies.

Auth flow:
  1. Next.js frontend calls POST /api/auth/backend-token (a Next.js route)
  2. That route reads the NextAuth session and signs a simple HS256 JWT
     with payload { sub, email, role } using NEXTAUTH_SECRET
  3. Frontend sends that JWT as:  Authorization: Bearer <token>
  4. FastAPI verifies the signature here and returns CurrentUser

This keeps ALL authentication in Next.js while giving FastAPI a clean,
stateless way to identify callers.
"""
from __future__ import annotations

import logging

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings
from app.models.blog import CurrentUser

logger = logging.getLogger(__name__)

_bearer = HTTPBearer(auto_error=False)

ALGORITHM = "HS256"


def _decode_token(token: str) -> dict:
    """Decode and verify the HS256 JWT signed by Next.js with NEXTAUTH_SECRET."""
    return jwt.decode(token, settings.nextauth_secret, algorithms=[ALGORITHM])


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser:
    """
    Dependency that extracts and validates the bearer JWT.
    Raises HTTP 401 if the token is missing, expired, or tampered with.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = _decode_token(credentials.credentials)
    except JWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    email: str | None = payload.get("email")
    if not user_id or not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    return CurrentUser(
        id=user_id,
        email=email,
        role=payload.get("role", "User"),
    )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser | None:
    """
    Same as get_current_user but returns None instead of raising 401.
    Use on endpoints that work for both anonymous and authenticated callers.
    """
    if not credentials:
        return None
    try:
        payload = _decode_token(credentials.credentials)
        user_id = payload.get("sub")
        email = payload.get("email")
        if user_id and email:
            return CurrentUser(id=user_id, email=email, role=payload.get("role", "User"))
    except JWTError:
        pass
    return None
