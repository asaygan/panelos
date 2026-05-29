"""FastAPI ASGI app."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from panelos_api import __version__
from panelos_api.api.v1 import api_v1_router
from panelos_api.config import get_settings
from panelos_api.core.exceptions import DomainError, domain_error_handler
from panelos_api.core.logging import configure_logging, get_logger, request_id_var
from panelos_api.db.session import dispose_engine

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from starlette.responses import Response


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(level=settings.LOG_LEVEL, json_output=settings.APP_ENV != "development")
    log = get_logger("panelos_api")
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
        CORSMiddleware,
        allow_origins=[settings.NEXT_PUBLIC_APP_URL, settings.APP_URL, *settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-Id"],
    )
    app.add_exception_handler(DomainError, domain_error_handler)
    app.include_router(api_v1_router)
    return app


app = create_app()
