"""Liveness + readiness probes."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text

from panelos_api import __version__
from panelos_api.config import Settings, get_settings
from panelos_api.db.session import get_sessionmaker

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    """Liveness: the process is up. No dependencies touched (cheap, used by the LB)."""
    return {"status": "ok", "version": __version__}


@router.get("/health/ready")
async def ready(settings: Settings = Depends(get_settings)) -> JSONResponse:
    """Readiness: can this instance actually serve requests (database reachable)?"""
    checks: dict[str, str] = {}
    try:
        async with get_sessionmaker()() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = f"error: {type(exc).__name__}"
    ok = all(v == "ok" for v in checks.values())
    return JSONResponse(
        status_code=200 if ok else 503,
        content={
            "status": "ok" if ok else "degraded",
            "version": __version__,
            "environment": settings.APP_ENV,
            "checks": checks,
        },
    )
