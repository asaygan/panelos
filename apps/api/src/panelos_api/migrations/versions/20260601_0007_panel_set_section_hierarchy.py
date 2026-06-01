"""panel_set_section_hierarchy: Panel Set → Panel → Section

Revision ID: 20260601_0007
Revises: 20260601_0006
Create Date: 2026-06-01

Additive + prod-safe:
- new `section_type` enum,
- new audit_action enum values (idempotent),
- `panel_sets` + `sections` tables (RLS-enabled, tenant-scoped),
- `panels.panel_set_id` (nullable FK, SET NULL),
- backfill: one default "General" Panel Set per company that has panels, then
  assign every existing panel to it. Guarded so a re-run is idempotent.
Panel-Set revisions / QR set-fallback are intentionally NOT part of this migration.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260601_0007"
down_revision = "20260601_0006"
branch_labels = None
depends_on = None

SECTION_TYPE_ENUM = postgresql.ENUM(
    "incoming",
    "distribution",
    "feeder",
    "vfd",
    "softstarter",
    "capacitor",
    "metering",
    "plc_cpu",
    "plc_io",
    "network",
    "ups",
    "terminal",
    "hmi",
    "protection",
    "generator",
    "custom",
    name="section_type",
    create_type=False,
)

NEW_AUDIT_ACTIONS = [
    "panel_set.created",
    "panel_set.updated",
    "panel_set.archived",
    "section.created",
    "section.updated",
    "section.deleted",
]


def _enable_rls(table: str) -> None:
    op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
    op.execute(
        f"""
        CREATE POLICY tenant_isolation_{table} ON {table}
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


def upgrade() -> None:
    bind = op.get_bind()

    SECTION_TYPE_ENUM.create(bind, checkfirst=True)

    # New audit_action enum values (committed before any use; idempotent).
    for value in NEW_AUDIT_ACTIONS:
        op.execute(f"ALTER TYPE audit_action ADD VALUE IF NOT EXISTS '{value}';")

    # panel_sets
    op.create_table(
        "panel_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("locations.id", ondelete="SET NULL")),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(40)),
        sa.Column("description", sa.String(2000)),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("company_id", "code", name="uq_panel_set_company_code"),
    )
    op.create_index("ix_panel_sets_company_id", "panel_sets", ["company_id"])
    op.create_index("ix_panel_sets_location_id", "panel_sets", ["location_id"])

    # sections
    op.create_table(
        "sections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("panel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("panels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("section_type", SECTION_TYPE_ENUM, nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer, nullable=False, server_default="0"),
        sa.Column("description", sa.String(2000)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("panel_id", "position", name="uq_section_panel_position"),
    )
    op.create_index("ix_sections_company_id", "sections", ["company_id"])
    op.create_index("ix_sections_panel_id", "sections", ["panel_id"])
    op.create_index("ix_section_panel_position", "sections", ["panel_id", "position"])

    # panels.panel_set_id
    op.add_column("panels", sa.Column("panel_set_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_panels_panel_set_id_panel_sets",
        "panels",
        "panel_sets",
        ["panel_set_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_panels_panel_set_id", "panels", ["panel_set_id"])

    # Backfill: a default "General" set per company that owns panels, then assign.
    op.execute(
        """
        INSERT INTO panel_sets (id, company_id, name, code, created_at, updated_at)
        SELECT gen_random_uuid(), c.id, 'General', 'GENERAL', now(), now()
        FROM companies c
        WHERE EXISTS (SELECT 1 FROM panels p WHERE p.company_id = c.id)
          AND NOT EXISTS (
            SELECT 1 FROM panel_sets ps WHERE ps.company_id = c.id AND ps.code = 'GENERAL'
          );
        """
    )
    op.execute(
        """
        UPDATE panels p
        SET panel_set_id = ps.id
        FROM panel_sets ps
        WHERE ps.company_id = p.company_id
          AND ps.code = 'GENERAL'
          AND p.panel_set_id IS NULL;
        """
    )

    _enable_rls("panel_sets")
    _enable_rls("sections")


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_sections ON sections;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_panel_sets ON panel_sets;")
    op.drop_index("ix_panels_panel_set_id", table_name="panels")
    op.drop_constraint("fk_panels_panel_set_id_panel_sets", "panels", type_="foreignkey")
    op.drop_column("panels", "panel_set_id")
    op.drop_table("sections")
    op.drop_table("panel_sets")
    SECTION_TYPE_ENUM.drop(op.get_bind(), checkfirst=True)
    # audit_action enum values are not dropped (Postgres limitation; left in place).
