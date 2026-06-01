"""Password hashing and JWT issue/verify."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from jose import JWTError, jwt
from passlib.context import CryptContext

from panelos_api.config import Settings, get_settings
from panelos_api.core.exceptions import Unauthorized

_pwd = CryptContext(schemes=["argon2"], deprecated="auto")

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    """Argon2id hash."""

    return _pwd.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Constant-time compare."""

    try:
        return _pwd.verify(password, hashed)
    except Exception:  # pragma: no cover - malformed hash
        return False


def _now() -> datetime:
    return datetime.now(UTC)


def issue_token(
    *,
    subject: str,
    token_type: TokenType,
    extra_claims: dict[str, Any] | None = None,
    settings: Settings | None = None,
) -> str:
    """Create a signed JWT for the given subject."""

    s = settings or get_settings()
    ttl = (
        timedelta(minutes=s.ACCESS_TOKEN_TTL_MINUTES)
        if token_type == "access"
        else timedelta(days=s.REFRESH_TOKEN_TTL_DAYS)
    )
    now = _now()
    claims: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
        "typ": token_type,
        # Unique per-token nonce so two tokens minted for the same subject within
        # the same second are never byte-identical (otherwise their refresh hashes
        # collide on the sessions.token_hash unique constraint).
        "jti": uuid.uuid4().hex,
    }
    if extra_claims:
        claims.update(extra_claims)
    return jwt.encode(claims, s.JWT_SECRET, algorithm=s.JWT_ALGORITHM)


def verify_token(
    token: str,
    *,
    expected_type: TokenType | None = None,
    settings: Settings | None = None,
) -> dict[str, Any]:
    """Decode + validate a JWT or raise ``Unauthorized``."""

    s = settings or get_settings()
    try:
        claims: dict[str, Any] = jwt.decode(token, s.JWT_SECRET, algorithms=[s.JWT_ALGORITHM])
    except JWTError as exc:
        raise Unauthorized("Invalid or expired token") from exc
    if expected_type and claims.get("typ") != expected_type:
        raise Unauthorized(f"Expected {expected_type} token, got {claims.get('typ')}")
    return claims
