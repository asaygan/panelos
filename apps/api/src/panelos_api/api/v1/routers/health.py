"""Health check."""

from __future__ import annotations

from fastapi import APIRouter

from panelos_api import __version__

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}
