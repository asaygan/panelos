"""SlowAPI rate limiter backed by Redis."""

from __future__ import annotations

from typing import TYPE_CHECKING

from slowapi import Limiter
from slowapi.util import get_remote_address

from panelos_api.config import get_settings

if TYPE_CHECKING:
    from fastapi import Request


def _key(request: Request) -> str:
    user = getattr(request.state, "user_id", None)
    if user:
        return f"user:{user}"
    return f"ip:{get_remote_address(request)}"


def build_limiter() -> Limiter:
    """Construct the app-wide limiter (Redis-backed)."""

    settings = get_settings()
    return Limiter(key_func=_key, storage_uri=settings.REDIS_URL, default_limits=["600/minute"])
