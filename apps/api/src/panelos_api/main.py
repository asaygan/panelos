"""FastAPI ASGI app."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from panelos_api import __version__
from panelos_api.api.v1 import api_v1_router
from panelos_api.config import get_settings
from panelos_api.core.exceptions import DomainError, domain_error_handler
from panelos_api.core.logging import configure_logging, get_logger, request_id_var
from panelos_api.core.rate_limit import auth_limiter
from panelos_api.db.session import dispose_engine

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from starlette.responses import Response


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(level=settings.LOG_LEVEL, json_output=settings.APP_ENV != "development")
    log = get_logger("panelos_api")
    if settings.SENTRY_DSN:
        try:
            import sentry_sdk

            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                environment=settings.APP_ENV,
                release=__version__,
                traces_sample_rate=0.0,
            )
            log.info("sentry_initialized")
        except Exception as exc:  # never block startup on observability
            log.warning("sentry_init_failed", error=str(exc))
    log.info("startup", env=settings.APP_ENV, version=__version__)
    try:
        yield
    finally:
        await dispose_engine()
        log.info("shutdown")


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        rid = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        token = request_id_var.set(rid)
        try:
            response: Response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers["X-Request-Id"] = rid
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Conservative security headers for a JSON API (no CSP)."""

    def __init__(self, app, *, hsts: bool) -> None:  # type: ignore[no-untyped-def]
        super().__init__(app)
        self._hsts = hsts

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        response: Response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        if self._hsts:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="PanelOS API",
        version=__version__,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )
    app.add_middleware(RequestIdMiddleware)
    app.add_middleware(
        SecurityHeadersMiddleware, hsts=settings.APP_ENV == "production"
    )
    # Auth rate limiting (in-memory, IP-keyed) via slowapi. Re-read the toggle at
    # app-construction time so it reflects the current settings (the limiter is a
    # module-level singleton whose `enabled` was baked at import — tests flip the
    # env after that import, so honor it here).
    auth_limiter.enabled = settings.RATE_LIMIT_ENABLED
    app.state.limiter = auth_limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    # De-duplicate CORS origins while preserving order.
    origins = list(
        dict.fromkeys(
            o
            for o in (settings.NEXT_PUBLIC_APP_URL, settings.APP_URL, *settings.CORS_ORIGINS)
            if o
        )
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )
    app.add_exception_handler(DomainError, domain_error_handler)

    # TEMP: capture unhandled exceptions w/ traceback for prod debugging
    # of the schematics upload 500. REMOVE after root-causing.
    @app.exception_handler(Exception)
    async def _unhandled_exc(request: Request, exc: Exception):  # type: ignore[unused-variable]
        import traceback as _tb
        from starlette.responses import JSONResponse as _JR
        get_logger("panelos_api").error(
            "unhandled_exception",
            path=str(request.url.path),
            error=str(exc),
            type=type(exc).__name__,
        )
        return _JR(
            {
                "detail": "internal_error",
                "type": type(exc).__name__,
                "message": str(exc),
                "trace": _tb.format_exc().splitlines()[-12:],
            },
            status_code=500,
        )

    app.include_router(api_v1_router)
    return app


app = create_app()
