"""Pytest fixtures.

Integration tests want a real Postgres (testcontainers). Unit tests should run
without Docker — they live in ``tests/unit`` and rely on the lightweight
``sqlite_session`` fixture when they need DB access at all.

Integration isolation guarantee
--------------------------------
The ``postgres_container`` fixture spins an **ephemeral** ``postgres:16-alpine``
container, points the application's ``DATABASE_URL`` at it, runs
``alembic upgrade head`` to build a throwaway schema, and tears the whole
container down at the end of the session. The production ``DATABASE_URL`` from
``.env`` (Supabase) is **never** used: the fixture overrides the env var and
resets the cached settings + global engine, and asserts the chosen URL is not a
Supabase host. See ``tests/integration/test_db_isolation`` markers / the
``db_url`` value printed by ``app_client``.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from panelos_api.db.base import Base
from panelos_api.db.models import *  # noqa: F401, F403


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


# ---------------------------------------------------------------------------
# Integration (real Postgres testcontainer) fixtures.
# ---------------------------------------------------------------------------


def _is_supabase(url: str) -> bool:
    """True when the URL points at a Supabase host (prod) — never test against it."""

    return "supabase.co" in url or "supabase.com" in url or "pooler.supabase" in url


@pytest.fixture(scope="session")
def postgres_container():
    """Start an ephemeral Postgres container for the test session.

    Yields the async connection URL, or ``None`` when Docker / testcontainers
    are unavailable so integration tests skip gracefully.
    """

    if os.getenv("SKIP_TESTCONTAINERS"):
        yield None
        return
    try:
        from testcontainers.postgres import PostgresContainer  # type: ignore[import-not-found]
    except Exception:  # pragma: no cover - dependency missing
        yield None
        return
    try:
        pg = PostgresContainer("postgres:16-alpine")
        pg.start()
    except Exception:  # pragma: no cover - docker missing
        yield None
        return

    sync_url = pg.get_connection_url()  # postgresql+psycopg2://...
    async_url = sync_url.replace("postgresql+psycopg2://", "postgresql+asyncpg://").replace(
        "postgresql://", "postgresql+asyncpg://"
    )
    assert not _is_supabase(async_url), "refusing to run integration tests against Supabase"
    try:
        yield async_url
    finally:
        pg.stop()


# Backwards-compatible alias used by older integration placeholders.
@pytest.fixture(scope="session")
def postgres_url(postgres_container: str | None) -> str | None:
    return postgres_container


def _run_alembic_upgrade(db_url: str) -> None:
    """Apply ``alembic upgrade head`` against ``db_url`` (sync, in-process)."""

    from pathlib import Path

    from alembic import command
    from alembic.config import Config

    api_root = Path(__file__).resolve().parent.parent  # apps/api
    cfg = Config(str(api_root / "alembic.ini"))
    cfg.set_main_option("script_location", str(api_root / "src" / "panelos_api" / "migrations"))
    # env.py reads settings.DATABASE_URL; we've already overridden the env var.
    cfg.set_main_option("sqlalchemy.url", db_url)
    command.upgrade(cfg, "head")


@pytest_asyncio.fixture(scope="session")
async def migrated_db(postgres_container: str | None) -> AsyncIterator[str]:
    """Override DATABASE_URL → container, run migrations, reset engine cache.

    Session-scoped so the schema is built exactly once. Guarantees the app's
    engine + cached settings point at the throwaway container, not ``.env``.
    """

    if postgres_container is None:
        pytest.skip("Postgres testcontainer unavailable (Docker/testcontainers missing)")

    from panelos_api.config import get_settings
    from panelos_api.db import session as db_session

    sync_url = postgres_container.replace("postgresql+asyncpg://", "postgresql://")

    prev_async = os.environ.get("DATABASE_URL")
    prev_sync = os.environ.get("DATABASE_SYNC_URL")
    os.environ["DATABASE_URL"] = postgres_container
    os.environ["DATABASE_SYNC_URL"] = sync_url
    # Keep auth deterministic + storage local for file tests.
    os.environ.setdefault("JWT_SECRET", "integration-test-secret")
    os.environ.setdefault("STORAGE_PROVIDER", "local")
    # Tests log in many times per second — keep the brute-force throttle off.
    os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

    get_settings.cache_clear()
    # Reset any previously-built global engine so it rebinds to the container.
    db_session._engine = None  # type: ignore[attr-defined]
    db_session._sessionmaker = None  # type: ignore[attr-defined]

    settings = get_settings()
    assert settings.DATABASE_URL == postgres_container
    assert not _is_supabase(settings.DATABASE_URL)

    # alembic's async env.py calls ``asyncio.run`` internally; run it in a
    # worker thread so it gets a fresh event loop (pytest-asyncio owns this one).
    import concurrent.futures

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        ex.submit(_run_alembic_upgrade, sync_url).result()

    try:
        yield postgres_container
    finally:
        await db_session.dispose_engine()
        if prev_async is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = prev_async
        if prev_sync is None:
            os.environ.pop("DATABASE_SYNC_URL", None)
        else:
            os.environ["DATABASE_SYNC_URL"] = prev_sync
        get_settings.cache_clear()


@pytest_asyncio.fixture()
async def clean_db(migrated_db: str) -> AsyncIterator[str]:
    """Truncate all data tables between tests for isolation (keeps schema)."""

    from sqlalchemy import text

    from panelos_api.db.session import get_engine

    engine = get_engine()
    async with engine.begin() as conn:
        rows = (
            await conn.execute(
                text(
                    "SELECT tablename FROM pg_tables "
                    "WHERE schemaname='public' AND tablename <> 'alembic_version'"
                )
            )
        ).all()
        tables = ", ".join(f'"{r[0]}"' for r in rows)
        if tables:
            await conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))
    yield migrated_db


@pytest_asyncio.fixture()
async def db_session_int(clean_db: str) -> AsyncIterator[AsyncSession]:
    """A committed async session bound to the container engine (for seeding)."""

    from panelos_api.db.session import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as session:
        yield session


@pytest_asyncio.fixture()
async def app_client(clean_db: str) -> AsyncIterator[object]:
    """An httpx AsyncClient driving the real ASGI app against the container.

    Prints the DB URL in use so the test log proves isolation from Supabase.
    """

    import httpx

    from panelos_api.main import create_app

    # Proof-of-isolation: visible in -s output, asserted to be non-Supabase.
    print(f"\n[integration] DATABASE_URL in use: {clean_db}")
    assert not _is_supabase(clean_db)

    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as client:
        yield client


@pytest_asyncio.fixture()
async def seed_owner(db_session_int: AsyncSession) -> dict[str, object]:
    """Create a company + an active Owner user with a known password.

    Returns a dict with ``company_id``, ``user_id``, ``email``, ``password``.
    """

    from panelos_api.services import auth_service

    email = "owner@acmeco.io"
    password = "OwnerPass123!"
    company, user, membership = await auth_service.signup_company_owner(
        db_session_int,
        company_name="Acme Manufacturing",
        company_slug="acme",
        owner_email=email,
        owner_name="Olivia Owner",
        password=password,
    )
    await db_session_int.commit()
    return {
        "company_id": str(company.id),
        "company_slug": company.slug,
        "user_id": str(user.id),
        "membership_id": str(membership.id),
        "email": email,
        "password": password,
    }


@pytest_asyncio.fixture()
async def owner_auth(app_client, seed_owner) -> dict[str, object]:  # type: ignore[no-untyped-def]
    """Log the seeded owner in and return ready-to-use auth headers.

    Headers include both the Bearer token and the seeded ``X-Company-Id`` so
    company-scoped routes resolve the right tenant.
    """

    r = await app_client.post(
        "/api/v1/auth/login",
        json={"email": seed_owner["email"], "password": seed_owner["password"]},
    )
    assert r.status_code == 200, r.text
    tokens = r.json()
    headers = {
        "Authorization": f"Bearer {tokens['access_token']}",
        "X-Company-Id": str(seed_owner["company_id"]),
    }
    return {"headers": headers, "tokens": tokens, "seed": seed_owner}
