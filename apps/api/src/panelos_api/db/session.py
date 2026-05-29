"""Async engine + sessionmaker."""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from panelos_api.config import Settings, get_settings

if TYPE_CHECKING:
    import uuid
    from collections.abc import AsyncIterator

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine(settings: Settings | None = None) -> AsyncEngine:
    """Lazily create the global async engine."""

    global _engine
    if _engine is None:
        s = settings or get_settings()
        _engine = create_async_engine(
            s.DATABASE_URL,
            echo=False,
            pool_pre_ping=True,
            future=True,
        )
    return _engine


def get_sessionmaker(settings: Settings | None = None) -> async_sessionmaker[AsyncSession]:
    """Lazily build the sessionmaker."""

    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(
            bind=get_engine(settings),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _sessionmaker


async def set_tenant_guc(session: AsyncSession, company_id: uuid.UUID) -> None:
    """Set Postgres ``app.company_id`` GUC for RLS policies."""

    await session.execute(
        text("SELECT set_config('app.company_id', :cid, true)"),
        {"cid": str(company_id)},
    )


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding a session."""

    sm = get_sessionmaker()
    async with sm() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    """Release engine resources on shutdown."""

    global _engine, _sessionmaker
    if _engine is not None:
        await cast("AsyncEngine", _engine).dispose()
    _engine = None
    _sessionmaker = None
