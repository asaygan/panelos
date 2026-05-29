"""label_templates

Revision ID: 20260529_0002
Revises: 20260529_0001
Create Date: 2026-05-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260529_0002"
down_revision = "20260529_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "label_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("concept", sa.String(20), nullable=False, server_default="engraved"),
        sa.Column("size_mm", sa.String(20), nullable=False, server_default="90x50"),
        sa.Column("layout_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_label_templates_company_id", "label_templates", ["company_id"])

    op.execute("ALTER TABLE label_templates ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation_label_templates ON label_templates
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


def downgrade() -> None:
    op.execute("DROP POLICY IF EXISTS tenant_isolation_label_templates ON label_templates;")
    op.drop_table("label_templates")
