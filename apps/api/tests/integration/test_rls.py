"""Postgres row-level security is enforced for the app role (migration 0010).

These run the policies directly, independent of the API's own company filters:
even a query with NO ``WHERE company_id`` must not see another tenant's rows.
"""

from __future__ import annotations

import uuid

import pytest
from sqlalchemy import text

APP_ROLE = "panelos_app"


async def _seed_two_companies() -> tuple[str, str]:
    from panelos_api.db.session import get_sessionmaker
    from panelos_api.services import auth_service, panel_service

    ids: list[str] = []
    sm = get_sessionmaker()
    async with sm() as session:  # owner session: bypasses RLS, like a script
        for slug in ("rls-a", "rls-b"):
            company, user, _m = await auth_service.signup_company_owner(
                session,
                company_name=slug,
                company_slug=slug,
                owner_email=f"o@{slug}.io",
                owner_name=slug,
                password="Password123!",
            )
            await panel_service.create_panel(
                session, company_id=company.id, actor_id=user.id, name=f"{slug} panel"
            )
            ids.append(str(company.id))
        await session.commit()
    return ids[0], ids[1]


@pytest.mark.asyncio
async def test_rls_denies_by_default_and_scopes_to_tenant(clean_db) -> None:  # type: ignore[no-untyped-def]
    from panelos_api.db.session import (
        enter_system_scope,
        get_sessionmaker,
        mark_request_session,
        set_tenant_guc,
    )

    a, b = await _seed_two_companies()
    sm = get_sessionmaker()

    async with sm() as session:
        mark_request_session(session, role=APP_ROLE)
        assert (await session.execute(text("SELECT current_user"))).scalar_one() == APP_ROLE

        # No tenant, no bypass: nothing is visible.
        for table in ("panels", "memberships", "audit_logs"):
            stmt = text(f"SELECT count(*) FROM {table}")  # noqa: S608
            n = (await session.execute(stmt)).scalar_one()
            assert n == 0, table

        # Tenant A sees only its own rows — with no company filter in the SQL.
        await set_tenant_guc(session, uuid.UUID(a))
        rows = (await session.execute(text("SELECT company_id::text FROM panels"))).scalars().all()
        assert rows == [a]

        # ...and still does after a mid-request commit starts a new transaction.
        await session.commit()
        rows = (await session.execute(text("SELECT company_id::text FROM panels"))).scalars().all()
        assert rows == [a]

        # Writing a row for another tenant is rejected by WITH CHECK.
        with pytest.raises(Exception, match="row-level security"):
            await session.execute(
                text("UPDATE panels SET company_id = :b WHERE company_id = :a"), {"a": a, "b": b}
            )
        await session.rollback()

        # Updating another tenant's rows silently matches nothing.
        res = await session.execute(
            text("UPDATE panels SET name = 'pwned' WHERE company_id = :b"), {"b": b}
        )
        assert res.rowcount == 0  # type: ignore[attr-defined]

        # Explicit system scope (login / QR resolve) sees across tenants...
        await enter_system_scope(session)
        n = (await session.execute(text("SELECT count(*) FROM panels"))).scalar_one()
        assert n == 2
        # ...and choosing a tenant leaves it again.
        await set_tenant_guc(session, uuid.UUID(b))
        rows = (await session.execute(text("SELECT company_id::text FROM panels"))).scalars().all()
        assert rows == [b]

        # The app role cannot tamper with migration state.
        with pytest.raises(Exception, match="permission denied"):
            await session.execute(text("SELECT * FROM alembic_version"))
        await session.rollback()


@pytest.mark.asyncio
async def test_every_tenant_table_has_fail_closed_policy(clean_db) -> None:  # type: ignore[no-untyped-def]
    from panelos_api.db.session import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as session:
        rows = (
            await session.execute(
                text(
                    """
                    SELECT c.table_name, cl.relrowsecurity,
                           (SELECT count(*) FROM pg_policies p
                             WHERE p.schemaname = 'public' AND p.tablename = c.table_name
                               AND p.policyname = 'tenant_isolation')
                    FROM information_schema.columns c
                    JOIN pg_class cl ON cl.relname = c.table_name
                    JOIN pg_namespace n ON n.oid = cl.relnamespace AND n.nspname = 'public'
                    WHERE c.table_schema = 'public' AND c.column_name = 'company_id'
                      AND cl.relkind = 'r'
                    """
                )
            )
        ).all()
    assert len(rows) >= 10
    missing = [r[0] for r in rows if not r[1] or r[2] != 1]
    assert missing == []
