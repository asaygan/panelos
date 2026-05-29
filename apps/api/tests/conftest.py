"""Pytest fixtures.

Integration tests want a real Postgres (testcontainers). Unit tests should run
without Docker — they live in ``tests/unit`` and rely on the lightweight
``sqlite_session`` fixture when they need DB access at all.
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator, Iterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from panelos_api.db.base import Base
from panelos_api.db.models import *  # noqa: F401, F403


@pytest.fixture(scope="session")
def event_loop() -> Iterator[asyncio.AbstractEventLoop]:
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture()
async def sqlite_session() -> AsyncIterator[AsyncSession]:
    """In-memory async sqlite session for ORM-only unit tests."""

    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    sm = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with sm() as session:
        yield session
    await engine.dispose()


@pytest.fixture(scope="session")
def postgres_url() -> str | None:
    """Spin up a Postgres testcontainer when Docker is available, else None.

    Integration tests skip gracefully when this returns None.
    """

    if os.getenv("SKIP_TESTCONTAINERS"):
        return None
    try:
        from testcontainers.postgres import PostgresContainer  # type: ignore[import-not-found]
    except Exception:  # pragma: no cover
        return None
    try:
        pg = PostgresContainer("postgres:16-alpine")
        pg.start()
    except Exception:  # pragma: no cover - docker missing
        return None
    url = pg.get_connection_url().replace("postgresql://", "postgresql+asyncpg://")
    yield url  # type: ignore[misc]
    pg.stop()
