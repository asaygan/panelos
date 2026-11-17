"""platform_modules: notifications, issues, maintenance, attachments, account security.

Revision ID: 20261117_0012
Revises: 20261117_0011
Create Date: 2026-11-17
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261117_0012"
down_revision = "20261117_0011"
branch_labels = None
depends_on = None

UUID = postgresql.UUID(as_uuid=True)

NEW_AUDIT_ACTIONS = [
    "auth.password_reset_requested",
    "auth.password_changed",
    "auth.mfa_enabled",
    "auth.mfa_disabled",
    "company.updated",
    "issue.created",
    "issue.updated",
    "issue.status_changed",
    "maintenance.recorded",
    "maintenance.plan_created",
    "maintenance.plan_updated",
    "maintenance.plan_deleted",
    "attachment.added",
    "attachment.removed",
    "panels.imported",
    "data.exported",
]

# Fail-closed tenant policy for any company_id table that doesn't have one yet
# (same policy as migration 0010; idempotent so later migrations can reuse it).
ENSURE_TENANT_POLICIES = """
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'company_id'
      AND tb.table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                   AND tablename = t AND policyname = 'tenant_isolation') THEN
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
    END IF;
  END LOOP;
END $$;
"""


def _ts() -> list[sa.Column]:  # type: ignore[type-arg]
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def _company() -> sa.Column:  # type: ignore[type-arg]
    return sa.Column(
        "company_id",
        UUID,
        sa.ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )


def _user_fk(name: str) -> sa.Column:  # type: ignore[type-arg]
    return sa.Column(name, UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)


def upgrade() -> None:
    for value in NEW_AUDIT_ACTIONS:
        op.execute(f"ALTER TYPE audit_action ADD VALUE IF NOT EXISTS '{value}';")

    # ---- users
    op.alter_column("users", "mfa_secret", type_=sa.Text(), existing_nullable=True)
    op.add_column(
        "users",
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default="false"),
    )
    # Before this migration a stored secret meant "MFA is on".
    op.execute("UPDATE users SET mfa_enabled = true WHERE mfa_secret IS NOT NULL")
    op.add_column(
        "users",
        sa.Column("mfa_recovery_codes", postgresql.JSONB(), nullable=False, server_default="[]"),
    )
    op.add_column("users", sa.Column("locale", sa.String(5), nullable=False, server_default="tr"))
    op.add_column(
        "users", sa.Column("password_changed_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("notification_prefs", postgresql.JSONB(), nullable=False, server_default="{}"),
    )

    # ---- companies
    op.add_column(
        "companies", sa.Column("default_locale", sa.String(5), nullable=False, server_default="tr")
    )
    op.add_column(
        "companies",
        sa.Column("timezone", sa.String(64), nullable=False, server_default="Europe/Istanbul"),
    )
    op.add_column(
        "companies",
        sa.Column("require_four_eyes", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "companies",
        sa.Column("engineer_can_approve", sa.Boolean(), nullable=False, server_default="true"),
    )

    # ---- revisions: who rejected + reviewer note
    op.add_column(
        "panel_revisions",
        sa.Column(
            "rejected_by", UUID, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
        ),
    )
    op.add_column("panel_revisions", sa.Column("review_note", sa.String(2000), nullable=True))

    # ---- password reset
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", UUID, primary_key=True),
        sa.Column(
            "user_id",
            UUID,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True, index=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        *_ts(),
    )

    # ---- notifications
    op.create_table(
        "notifications",
        sa.Column("id", UUID, primary_key=True),
        _company(),
        sa.Column(
            "user_id",
            UUID,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("params", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("link", sa.String(300), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        *_ts(),
    )
    op.create_index(
        "ix_notifications_user_unread", "notifications", ["user_id", "read_at", "created_at"]
    )

    # ---- issues
    op.create_table(
        "issues",
        sa.Column("id", UUID, primary_key=True),
        _company(),
        sa.Column("panel_id", UUID, sa.ForeignKey("panels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(16), nullable=False, server_default="medium"),
        sa.Column("status", sa.String(16), nullable=False, server_default="open"),
        _user_fk("reported_by"),
        _user_fk("assigned_to"),
        _user_fk("resolved_by"),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        *_ts(),
        sa.UniqueConstraint("company_id", "number", name="uq_issues_company_number"),
        sa.CheckConstraint(
            "severity IN ('low','medium','high','critical')", name="ck_issues_severity"
        ),
        sa.CheckConstraint(
            "status IN ('open','in_progress','resolved','closed')", name="ck_issues_status"
        ),
    )
    op.create_index("ix_issues_company_status", "issues", ["company_id", "status"])
    op.create_index("ix_issues_panel", "issues", ["panel_id", "created_at"])

    # ---- maintenance
    op.create_table(
        "maintenance_plans",
        sa.Column("id", UUID, primary_key=True),
        _company(),
        sa.Column(
            "panel_id",
            UUID,
            sa.ForeignKey("panels.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False, server_default="preventive"),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("next_due_on", sa.Date(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("notified_for", sa.Date(), nullable=True),
        *_ts(),
        sa.CheckConstraint("interval_days > 0", name="ck_maintenance_plans_interval"),
    )
    op.create_index(
        "ix_maintenance_plans_due", "maintenance_plans", ["company_id", "active", "next_due_on"]
    )
    op.create_table(
        "maintenance_records",
        sa.Column("id", UUID, primary_key=True),
        _company(),
        sa.Column("panel_id", UUID, sa.ForeignKey("panels.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "plan_id",
            UUID,
            sa.ForeignKey("maintenance_plans.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("issue_id", UUID, sa.ForeignKey("issues.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kind", sa.String(20), nullable=False, server_default="inspection"),
        sa.Column("result", sa.String(12), nullable=False, server_default="ok"),
        sa.Column("summary", sa.String(300), nullable=False),
        sa.Column("findings", sa.Text(), nullable=True),
        sa.Column("performed_at", sa.DateTime(timezone=True), nullable=False),
        _user_fk("performed_by"),
        sa.Column("performed_by_name", sa.String(200), nullable=True),
        *_ts(),
        sa.CheckConstraint("result IN ('ok','attention','fail')", name="ck_maintenance_result"),
    )
    op.create_index("ix_maintenance_panel_at", "maintenance_records", ["panel_id", "performed_at"])

    # ---- attachments
    op.create_table(
        "attachments",
        sa.Column("id", UUID, primary_key=True),
        _company(),
        sa.Column("panel_id", UUID, sa.ForeignKey("panels.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "issue_id",
            UUID,
            sa.ForeignKey("issues.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "maintenance_id",
            UUID,
            sa.ForeignKey("maintenance_records.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column(
            "file_id", UUID, sa.ForeignKey("pdf_files.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("caption", sa.String(300), nullable=True),
        _user_fk("uploaded_by"),
        *_ts(),
    )
    op.create_index("ix_attachments_panel", "attachments", ["panel_id", "created_at"])

    # Scan analytics by day need a company-wide time index.
    op.create_index("ix_scan_events_at", "scan_events", ["at"])

    op.execute(ENSURE_TENANT_POLICIES)


def downgrade() -> None:
    op.drop_index("ix_scan_events_at", table_name="scan_events")
    for table in (
        "attachments",
        "maintenance_records",
        "maintenance_plans",
        "issues",
        "notifications",
        "password_reset_tokens",
    ):
        op.drop_table(table)
    op.drop_column("panel_revisions", "review_note")
    op.drop_column("panel_revisions", "rejected_by")
    for col in ("engineer_can_approve", "require_four_eyes", "timezone", "default_locale"):
        op.drop_column("companies", col)
    for col in (
        "notification_prefs",
        "password_changed_at",
        "locale",
        "mfa_recovery_codes",
        "mfa_enabled",
    ):
        op.drop_column("users", col)
    # audit_action enum values cannot be dropped in postgres; left in place.
