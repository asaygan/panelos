"""panel_lifecycle_status: swap operational status enum + add history table

Revision ID: 20260602_0008
Revises: 20260601_0007
Create Date: 2026-06-02

Replaces the operational ``panel_status`` enum (ok/warn/fault/idle) with a
lifecycle enum (draft → engineering → released → installed → commissioned →
in_service → archived). PanelOS is NOT a SCADA system; status now means
"where in its lifecycle is this asset?", not "is it currently energized?".

Existing rows are backfilled:
  archived_at IS NOT NULL  → 'archived'
  everything else          → 'installed'

A new ``panel_status_history`` table records every transition so the UI can
render a per-panel timeline. The first row per existing panel is seeded from
the backfill so the timeline isn't empty.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260602_0008"
down_revision = "20260601_0007"
branch_labels = None
depends_on = None

LIFECYCLE_ENUM = postgresql.ENUM(
    "draft",
    "engineering",
    "released",
    "installed",
    "commissioned",
    "in_service",
    "archived",
    name="panel_lifecycle_status",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()

    # 1. New audit_action enum value (committed before any use).
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'panel.status_changed';")

    # 2. Create the new lifecycle enum.
    LIFECYCLE_ENUM.create(bind, checkfirst=True)

    # 3. Drop default + swap the panels.status column type with a USING cast that
    #    backfills every existing row.
    op.execute("ALTER TABLE panels ALTER COLUMN status DROP DEFAULT;")
    op.execute(
        """
        ALTER TABLE panels
          ALTER COLUMN status TYPE panel_lifecycle_status
          USING (
            CASE
              WHEN archived_at IS NOT NULL THEN 'archived'::panel_lifecycle_status
              ELSE 'installed'::panel_lifecycle_status
            END
          );
        """
    )
    op.execute("ALTER TABLE panels ALTER COLUMN status SET DEFAULT 'draft';")

    # 4. Old enum is no longer referenced — drop it.
    op.execute("DROP TYPE IF EXISTS panel_status;")

    # 5. panel_status_history table.
    op.create_table(
        "panel_status_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "panel_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("panels.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("from_status", LIFECYCLE_ENUM, nullable=True),
        sa.Column("to_status", LIFECYCLE_ENUM, nullable=False),
        sa.Column(
            "changed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("note", sa.String(1000), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_panel_status_history_company_id", "panel_status_history", ["company_id"])
    op.create_index("ix_panel_status_history_panel_id", "panel_status_history", ["panel_id"])
    op.create_index(
        "ix_panel_status_history_panel_created",
        "panel_status_history",
        ["panel_id", "created_at"],
    )

    # 6. RLS on the new tenant table (same GUC pattern as migration 0001).
    op.execute("ALTER TABLE panel_status_history ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation_panel_status_history ON panel_status_history
        USING (
          current_setting('app.company_id', true) IS NULL
          OR company_id::text = current_setting('app.company_id', true)
        )
        WITH CHECK (
          current_setting('app.company_id', true) IS NULL
          OR company_id::text = current_setting('app.company_id', true)
        );
        """
    )

    # 7. Seed an initial history row per existing panel so the timeline isn't
    #    empty. gen_random_uuid() is available (pgcrypto from migration 0001).
    op.execute(
        """
        INSERT INTO panel_status_history (
          id, company_id, panel_id, from_status, to_status,
          changed_by, note, created_at, updated_at
        )
        SELECT
          gen_random_uuid(), p.company_id, p.id, NULL, p.status,
          NULL,
          'Backfilled by migration 0008 (lifecycle status rollout)',
          p.created_at, p.created_at
        FROM panels p;
        """
    )


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_panel_status_history ON panel_status_history;")
    op.drop_index("ix_panel_status_history_panel_created", table_name="panel_status_history")
    op.drop_index("ix_panel_status_history_panel_id", table_name="panel_status_history")
    op.drop_index("ix_panel_status_history_company_id", table_name="panel_status_history")
    op.drop_table("panel_status_history")

    # Recreate the old operational enum + swap the column back. Existing data
    # collapses: archived stays as 'idle' in the old vocabulary; everything else
    # becomes 'ok'. Lossy but reversible.
    op.execute("CREATE TYPE panel_status AS ENUM ('ok', 'warn', 'fault', 'idle');")
    op.execute("ALTER TABLE panels ALTER COLUMN status DROP DEFAULT;")
    op.execute(
        """
        ALTER TABLE panels
          ALTER COLUMN status TYPE panel_status
          USING (
            CASE
              WHEN status = 'archived'::panel_lifecycle_status THEN 'idle'::panel_status
              ELSE 'ok'::panel_status
            END
          );
        """
    )
    op.execute("ALTER TABLE panels ALTER COLUMN status SET DEFAULT 'ok';")
    op.execute("DROP TYPE IF EXISTS panel_lifecycle_status;")
    # audit_action enum value left in place (Postgres can't drop enum values).
