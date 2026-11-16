"""Async engine + sessionmaker."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, cast

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session

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


# ---------------------------------------------------------------------------
# Row-level security context
#
# Request sessions carry an ``RlsContext`` in ``session.info``. At the start of
# EVERY transaction on such a session (including the ones that follow a
# mid-request commit) we re-apply, transaction-locally:
#
#   * ``SET LOCAL ROLE <app role>``  — drop from table owner to the plain DML
#     role so policies are enforced at all (owners bypass RLS);
#   * ``app.company_id``             — the tenant the request acts for;
#   * ``app.rls_bypass``             — 'on' only for explicit cross-tenant
#     system lookups (login, invite accept, QR token resolve).
#
# With neither a tenant nor the bypass flag set, policies match no rows.
# Sessions created outside a request (migrations, scripts, test seeding) carry
# no context and keep running as the owner.
# ---------------------------------------------------------------------------

_RLS_KEY = "panelos_rls"
_ROLE_RE = re.compile(r"^[a-z_][a-z0-9_]{0,62}$")


@dataclass(slots=True)
class RlsContext:
    role: str | None = None
    company_id: str = ""
    bypass: bool = False


def _apply_rls(connection: Any, ctx: RlsContext) -> None:
    if ctx.role:
        connection.execute(text(f'SET LOCAL ROLE "{ctx.role}"'))
    connection.execute(
        text(
            "SELECT set_config('app.company_id', :cid, true), "
            "set_config('app.rls_bypass', :bypass, true)"
        ),
        {"cid": ctx.company_id, "bypass": "on" if ctx.bypass else "off"},
    )


@event.listens_for(Session, "after_begin")
def _rls_after_begin(session: Session, _transaction: Any, connection: Any) -> None:
    ctx = session.info.get(_RLS_KEY)
    if ctx is not None:
        _apply_rls(connection, ctx)


def mark_request_session(session: AsyncSession, *, role: str | None) -> None:
    """Attach a deny-by-default RLS context to a request-scoped session."""

    if role is not None and not _ROLE_RE.match(role):
        raise ValueError(f"invalid DB_APP_ROLE: {role!r}")
    session.info[_RLS_KEY] = RlsContext(role=role)


async def _reapply(session: AsyncSession) -> None:
    ctx: RlsContext | None = session.info.get(_RLS_KEY)
    if ctx is None:
        return
    # Covers the case where a transaction is already open; a fresh one gets the
    # same values again from the after_begin hook (idempotent).
    await session.execute(
        text(
            "SELECT set_config('app.company_id', :cid, true), "
            "set_config('app.rls_bypass', :bypass, true)"
        ),
        {"cid": ctx.company_id, "bypass": "on" if ctx.bypass else "off"},
    )


async def set_tenant_guc(session: AsyncSession, company_id: uuid.UUID) -> None:
    """Scope the session to one tenant (and leave any system scope)."""

    ctx: RlsContext | None = session.info.get(_RLS_KEY)
    if ctx is None:
        ctx = session.info[_RLS_KEY] = RlsContext()
    ctx.company_id = str(company_id)
    ctx.bypass = False
    await _reapply(session)


async def enter_system_scope(session: AsyncSession) -> None:
    """Allow cross-tenant reads/writes for a deliberate system lookup.

    Only for code that must find a row *before* the tenant is known (resolve a
    login, an invite token, a QR token). Call ``set_tenant_guc`` to leave it.
    """

    ctx: RlsContext | None = session.info.get(_RLS_KEY)
    if ctx is None:
        return
    ctx.bypass = True
    await _reapply(session)


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
