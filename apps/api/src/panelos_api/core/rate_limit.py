"""Request throttling.

Two layers, both in-process (one bucket set per API instance):

* ``auth_limiter`` — slowapi decorator limits keyed by client IP, for
  unauthenticated endpoints (login/refresh/accept-invite/bootstrap/QR).
* ``enforce`` — explicit named buckets for limits that can't be expressed per
  IP, e.g. brute-force protection keyed by the *account* being attacked. Web
  logins reach the API from the Next.js server (a shared egress IP), so an
  IP-only limit would either throttle every user at once or protect nobody.

Disabled when ``RATE_LIMIT_ENABLED`` is falsy (tests log in many times/second).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from limits import parse
from limits.storage import MemoryStorage
from limits.strategies import MovingWindowRateLimiter
from slowapi import Limiter

from panelos_api.config import get_settings
from panelos_api.core.exceptions import TooManyRequests

if TYPE_CHECKING:
    from fastapi import Request


def client_ip(request: Request) -> str:
    """Best-effort client address behind the App Runner proxy.

    The proxy *appends* the address of whoever connected to it to
    ``X-Forwarded-For``, so the right-most entry is the only one a client can't
    forge. Everything to its left is caller-supplied and must not be trusted
    for throttling.
    """

    xff = request.headers.get("x-forwarded-for")
    if xff:
        last = xff.rsplit(",", 1)[-1].strip()
        if last:
            return last
    return request.client.host if request.client else "unknown"


auth_limiter = Limiter(
    key_func=client_ip,
    default_limits=[],
    enabled=get_settings().RATE_LIMIT_ENABLED,
)

_window = MovingWindowRateLimiter(MemoryStorage())


def enforce(scope: str, key: str, limit: str) -> None:
    """Count one hit against ``scope``/``key``; raise 429 once ``limit`` is exceeded."""

    if not get_settings().RATE_LIMIT_ENABLED:
        return
    if not _window.hit(parse(limit), scope, key):
        raise TooManyRequests("too many attempts, try again shortly")
