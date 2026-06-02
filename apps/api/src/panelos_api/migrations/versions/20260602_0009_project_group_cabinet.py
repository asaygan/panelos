"""project_group_cabinet: Project → System Group → Panel → Cabinet rewrite.

Revision ID: 20260602_0009
Revises: 20260602_0008
Create Date: 2026-06-02

Restructures the hierarchy to match real industrial asset management:

  - ``panel_sets`` → ``projects`` (renamed + gains customer/site/lifecycle_status)
  - new ``system_groups`` table between Project and Panel (with group_type +
    lifecycle_status)
  - new ``cabinets`` table replaces ``sections`` (renamed + drops section_type
    + adds code/notes)
  - ``panels.panel_set_id`` → ``panels.system_group_id`` (via auto-created
    "General" CUSTOM group per existing project)
  - ``panels.status`` and ``panel_status_history`` are dropped — lifecycle now
    lives on Project + System Group only
  - new ``project_status_history`` + ``group_status_history`` tables with RLS

Backfill is idempotent. Existing prod data:
  every panel_set → 1 project with the same name/code/location
  every project   → 1 'General' (CUSTOM) system group, lifecycle 'installed'
  every panel     → re-pointed to its project's 'General' group
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260602_0009"
down_revision = "20260602_0008"
branch_labels = None
depends_on = None

GROUP_TYPE_ENUM = postgresql.ENUM(
    "mcc",
    "lvdp",
    "mv",
    "plc",
    "pfc",
    "ups",
    "scada",
    "dcs",
    "custom",
    name="group_type",
    create_type=False,
)

# The shared lifecycle enum already exists from migration 0008 as
# ``panel_lifecycle_status``. To match the new code (model uses name
# ``lifecycle_status``) we rename the type.

NEW_AUDIT_ACTIONS = [
    "project.created",
    "project.updated",
    "project.archived",
    "project.status_changed",
    "system_group.created",
    "system_group.updated",
    "system_group.deleted",
    "system_group.status_changed",
    "cabinet.created",
    "cabinet.updated",
    "cabinet.deleted",
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

    # 1. New audit actions.
    for value in NEW_AUDIT_ACTIONS:
        op.execute(f"ALTER TYPE audit_action ADD VALUE IF NOT EXISTS '{value}';")

    # 2. Rename the lifecycle enum: panel_lifecycle_status → lifecycle_status.
    op.execute("ALTER TYPE panel_lifecycle_status RENAME TO lifecycle_status;")

    # 3. Drop the panel lifecycle artifacts (history table + the panels.status column).
    op.execute("DROP POLICY IF EXISTS tenant_isolation_panel_status_history ON panel_status_history;")
    op.execute("DROP TABLE IF EXISTS panel_status_history;")
    op.execute("ALTER TABLE panels DROP COLUMN IF EXISTS status;")

    # 4. Rename panel_sets → projects + extend it.
    op.execute("ALTER POLICY tenant_isolation_panel_sets ON panel_sets RENAME TO tenant_isolation_projects;")
    op.execute("ALTER TABLE panel_sets RENAME TO projects;")
    op.execute("ALTER INDEX ix_panel_sets_company_id RENAME TO ix_projects_company_id;")
    op.execute("ALTER INDEX ix_panel_sets_location_id RENAME TO ix_projects_location_id;")
    op.execute("ALTER TABLE projects RENAME CONSTRAINT uq_panel_set_company_code TO uq_project_company_code;")

    op.add_column("projects", sa.Column("customer", sa.String(200), nullable=True))
    op.add_column("projects", sa.Column("site", sa.String(200), nullable=True))
    op.add_column(
        "projects",
        sa.Column(
            "lifecycle_status",
            postgresql.ENUM(name="lifecycle_status", create_type=False),
            nullable=False,
            server_default="draft",
        ),
    )
    # Backfill: archived projects keep 'archived'; everything else becomes
    # 'installed' (mid-life sane default — matches what existing panels were
    # backfilled to in migration 0008).
    op.execute(
        """
        UPDATE projects
        SET lifecycle_status = CASE
            WHEN archived_at IS NOT NULL THEN 'archived'::lifecycle_status
            ELSE 'installed'::lifecycle_status
        END;
        """
    )

    # 5. Create the group_type enum + system_groups table.
    GROUP_TYPE_ENUM.create(bind, checkfirst=True)
    op.create_table(
        "system_groups",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("code", sa.String(40), nullable=True),
        sa.Column("group_type", GROUP_TYPE_ENUM, nullable=False, server_default="custom"),
        sa.Column(
            "lifecycle_status",
            postgresql.ENUM(name="lifecycle_status", create_type=False),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("description", sa.String(2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("project_id", "code", name="uq_system_group_project_code"),
    )
    op.create_index("ix_system_groups_company_id", "system_groups", ["company_id"])
    op.create_index("ix_system_groups_project_id", "system_groups", ["project_id"])
    op.create_index("ix_system_group_project", "system_groups", ["project_id"])
    _enable_rls("system_groups")

    # 6. Backfill — one 'General' (CUSTOM) group per existing project.
    op.execute(
        """
        INSERT INTO system_groups (
          id, company_id, project_id, name, code, group_type,
          lifecycle_status, created_at, updated_at
        )
        SELECT gen_random_uuid(), p.company_id, p.id, 'General', 'GENERAL',
               'custom'::group_type, 'installed'::lifecycle_status,
               now(), now()
        FROM projects p
        WHERE NOT EXISTS (
          SELECT 1 FROM system_groups g
          WHERE g.project_id = p.id AND g.code = 'GENERAL'
        );
        """
    )

    # 7. Add panels.system_group_id, backfill from the old panel_set_id, drop it.
    op.add_column(
        "panels",
        sa.Column("system_group_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_panels_system_group_id_system_groups",
        "panels",
        "system_groups",
        ["system_group_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_panels_system_group_id", "panels", ["system_group_id"])
    op.execute(
        """
        UPDATE panels p
        SET system_group_id = g.id
        FROM system_groups g
        WHERE g.project_id = p.panel_set_id AND g.code = 'GENERAL'
          AND p.system_group_id IS NULL;
        """
    )
    op.drop_index("ix_panels_panel_set_id", table_name="panels")
    op.drop_constraint("fk_panels_panel_set_id_panel_sets", "panels", type_="foreignkey")
    op.drop_column("panels", "panel_set_id")

    # 8. Rename sections → cabinets; drop section_type + description; add code + notes.
    op.execute("DROP POLICY IF EXISTS tenant_isolation_sections ON sections;")
    op.execute("ALTER TABLE sections RENAME TO cabinets;")
    op.execute("ALTER INDEX ix_sections_company_id RENAME TO ix_cabinets_company_id;")
    op.execute("ALTER INDEX ix_sections_panel_id RENAME TO ix_cabinets_panel_id;")
    op.execute("ALTER INDEX ix_section_panel_position RENAME TO ix_cabinet_panel_position;")
    op.execute(
        "ALTER TABLE cabinets RENAME CONSTRAINT uq_section_panel_position TO uq_cabinet_panel_position;"
    )
    op.execute("ALTER TABLE cabinets DROP COLUMN IF EXISTS section_type;")
    op.execute("ALTER TABLE cabinets DROP COLUMN IF EXISTS description;")
    op.add_column("cabinets", sa.Column("code", sa.String(40), nullable=True))
    op.add_column("cabinets", sa.Column("notes", sa.String(2000), nullable=True))
    _enable_rls("cabinets")
    # Drop the dead section_type enum.
    op.execute("DROP TYPE IF EXISTS section_type;")

    # 9. project_status_history + group_status_history tables.
    for parent_table, parent_col, table_name, idx_col_suffix in [
        ("projects", "project_id", "project_status_history", "project"),
        ("system_groups", "system_group_id", "group_status_history", "group"),
    ]:
        op.create_table(
            table_name,
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "company_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("companies.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                parent_col,
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey(f"{parent_table}.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "from_status",
                postgresql.ENUM(name="lifecycle_status", create_type=False),
                nullable=True,
            ),
            sa.Column(
                "to_status",
                postgresql.ENUM(name="lifecycle_status", create_type=False),
                nullable=False,
            ),
            sa.Column(
                "changed_by",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("note", sa.String(1000), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index(f"ix_{idx_col_suffix}_status_history_company_id", table_name, ["company_id"])
        op.create_index(
            f"ix_{idx_col_suffix}_status_history_{idx_col_suffix.replace('group','group')}_created",
            table_name,
            [parent_col, "created_at"],
        )
        _enable_rls(table_name)

    # 10. Seed initial status_history rows so the timeline isn't empty.
    op.execute(
        """
        INSERT INTO project_status_history (
          id, company_id, project_id, from_status, to_status, changed_by, note,
          created_at, updated_at
        )
        SELECT gen_random_uuid(), p.company_id, p.id, NULL, p.lifecycle_status,
               NULL, 'Backfilled by migration 0009 (project/group hierarchy)',
               p.created_at, p.created_at
        FROM projects p;
        """
    )
    op.execute(
        """
        INSERT INTO group_status_history (
          id, company_id, system_group_id, from_status, to_status, changed_by, note,
          created_at, updated_at
        )
        SELECT gen_random_uuid(), g.company_id, g.id, NULL, g.lifecycle_status,
               NULL, 'Backfilled by migration 0009 (project/group hierarchy)',
               g.created_at, g.created_at
        FROM system_groups g;
        """
    )


def downgrade() -> None:
    # Lossy reverse — recreates the panel_set/section world but loses
    # system_groups (panels collapse back onto their project as 'General').
    op.execute("DROP POLICY IF EXISTS tenant_isolation_group_status_history ON group_status_history;")
    op.execute("DROP TABLE IF EXISTS group_status_history;")
    op.execute("DROP POLICY IF EXISTS tenant_isolation_project_status_history ON project_status_history;")
    op.execute("DROP TABLE IF EXISTS project_status_history;")

    op.execute("DROP POLICY IF EXISTS tenant_isolation_cabinets ON cabinets;")
    op.execute("ALTER TABLE cabinets DROP COLUMN IF EXISTS notes;")
    op.execute("ALTER TABLE cabinets DROP COLUMN IF EXISTS code;")
    op.execute("ALTER TABLE cabinets RENAME TO sections;")
    op.execute("ALTER INDEX ix_cabinets_company_id RENAME TO ix_sections_company_id;")
    op.execute("ALTER INDEX ix_cabinets_panel_id RENAME TO ix_sections_panel_id;")
    op.execute("ALTER INDEX ix_cabinet_panel_position RENAME TO ix_section_panel_position;")
    op.execute(
        "ALTER TABLE sections RENAME CONSTRAINT uq_cabinet_panel_position TO uq_section_panel_position;"
    )

    op.add_column(
        "panels",
        sa.Column("panel_set_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.execute(
        """
        UPDATE panels p
        SET panel_set_id = g.project_id
        FROM system_groups g
        WHERE g.id = p.system_group_id;
        """
    )
    op.create_index("ix_panels_panel_set_id", "panels", ["panel_set_id"])
    op.drop_index("ix_panels_system_group_id", table_name="panels")
    op.drop_constraint("fk_panels_system_group_id_system_groups", "panels", type_="foreignkey")
    op.drop_column("panels", "system_group_id")

    op.execute("DROP POLICY IF EXISTS tenant_isolation_system_groups ON system_groups;")
    op.execute("DROP TABLE IF EXISTS system_groups;")
    op.execute("DROP TYPE IF EXISTS group_type;")

    op.execute("ALTER TABLE projects DROP COLUMN IF EXISTS lifecycle_status;")
    op.execute("ALTER TABLE projects DROP COLUMN IF EXISTS site;")
    op.execute("ALTER TABLE projects DROP COLUMN IF EXISTS customer;")
    op.execute("ALTER TABLE projects RENAME TO panel_sets;")
    op.execute("ALTER INDEX ix_projects_company_id RENAME TO ix_panel_sets_company_id;")
    op.execute("ALTER INDEX ix_projects_location_id RENAME TO ix_panel_sets_location_id;")
    op.execute("ALTER TABLE panel_sets RENAME CONSTRAINT uq_project_company_code TO uq_panel_set_company_code;")
    op.execute("ALTER POLICY tenant_isolation_projects ON panel_sets RENAME TO tenant_isolation_panel_sets;")

    op.add_column(
        "panels",
        sa.Column("status", postgresql.ENUM(name="lifecycle_status", create_type=False), nullable=True),
    )
    op.execute("UPDATE panels SET status = 'installed'::lifecycle_status;")
    op.execute("ALTER TABLE panels ALTER COLUMN status SET NOT NULL;")
    op.execute("ALTER TYPE lifecycle_status RENAME TO panel_lifecycle_status;")
    # audit_action enum values are not removable.
