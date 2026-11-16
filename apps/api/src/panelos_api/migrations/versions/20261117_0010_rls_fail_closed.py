"""rls_fail_closed: make row-level security actually enforce tenant isolation.

Revision ID: 20261117_0010
Revises: 20260602_0009
Create Date: 2026-11-17

Until now RLS was decorative:

  * every policy allowed ALL rows whenever ``app.company_id`` was unset, and
  * the API connected as the table owner, which bypasses RLS entirely.

This migration

  1. creates a non-owner, NOLOGIN role ``panelos_app`` with plain DML rights.
     The API assumes it per transaction (``SET LOCAL ROLE``) when
     ``DB_APP_ROLE=panelos_app`` is configured — no new credentials needed;
  2. rewrites the policy on every table that has a ``company_id`` column to be
     fail-closed: a row is visible only when it belongs to the current tenant,
     or when the transaction explicitly opted into a cross-tenant system lookup
     (``app.rls_bypass = 'on'`` — login, invite accept, QR token resolve).

The owner role (migrations, scripts, seeding) is unaffected.
"""

# ruff: noqa: S608  (static identifiers only, no user input)
from __future__ import annotations

from alembic import op

revision = "20261117_0010"
down_revision = "20260602_0009"
branch_labels = None
depends_on = None

APP_ROLE = "panelos_app"

_TENANT_TABLES_SQL = """
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'company_id'
      AND t.table_type = 'BASE TABLE'
"""


def upgrade() -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{APP_ROLE}') THEN
            CREATE ROLE {APP_ROLE} NOLOGIN NOINHERIT;
          END IF;
          -- The connecting (owner) role must be able to SET ROLE to it. On
          -- PG16+ creating a role does not imply that, so grant explicitly
          -- (idempotent).
          EXECUTE format('GRANT {APP_ROLE} TO %I', current_user);
        END $$;
        """
    )
    op.execute(f"GRANT USAGE ON SCHEMA public TO {APP_ROLE};")
    op.execute(
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {APP_ROLE};"
    )
    op.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {APP_ROLE};")
    # Tables/sequences created by later migrations inherit the same grants.
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {APP_ROLE};"
    )
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {APP_ROLE};"
    )
    # The app role must never touch migration bookkeeping.
    op.execute(f"REVOKE ALL ON TABLE alembic_version FROM {APP_ROLE};")

    op.execute(
        f"""
        DO $$
        DECLARE
          t text;
          pol text;
        BEGIN
          FOR t IN {_TENANT_TABLES_SQL} LOOP
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
            FOR pol IN SELECT policyname FROM pg_policies
                       WHERE schemaname = 'public' AND tablename = t LOOP
              EXECUTE format('DROP POLICY %I ON %I', pol, t);
            END LOOP;
            EXECUTE format($f$
              CREATE POLICY tenant_isolation ON %I
              USING (
                current_setting('app.rls_bypass', true) = 'on'
                OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
              )
              WITH CHECK (
                current_setting('app.rls_bypass', true) = 'on'
                OR company_id = NULLIF(current_setting('app.company_id', true), '')::uuid
              )
            $f$, t);
          END LOOP;
        END $$;
        """
    )


def downgrade() -> None:
    # Restore the previous (permissive-when-unset) policies.
    op.execute(
        f"""
        DO $$
        DECLARE
          t text;
        BEGIN
          FOR t IN {_TENANT_TABLES_SQL} LOOP
            EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
            EXECUTE format($f$
              CREATE POLICY %I ON %I
              USING (
                current_setting('app.company_id', true) IS NULL
                OR company_id::text = current_setting('app.company_id', true)
              )
              WITH CHECK (
                current_setting('app.company_id', true) IS NULL
                OR company_id::text = current_setting('app.company_id', true)
              )
            $f$, 'tenant_isolation_' || t, t);
          END LOOP;
        END $$;
        """
    )
    op.execute(
        f"""
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{APP_ROLE}') THEN
            EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {APP_ROLE}';
            EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {APP_ROLE}';
            EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM {APP_ROLE}';
            EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM {APP_ROLE}';
            EXECUTE 'REVOKE USAGE ON SCHEMA public FROM {APP_ROLE}';
          END IF;
        END $$;
        """
    )
