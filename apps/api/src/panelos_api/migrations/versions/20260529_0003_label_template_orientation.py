"""label_template_orientation

Revision ID: 20260529_0003
Revises: 20260529_0002
Create Date: 2026-05-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260529_0003"
down_revision = "20260529_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "label_templates",
        sa.Column(
            "orientation",
            sa.String(16),
            nullable=False,
            server_default="landscape",
        ),
    )


def downgrade() -> None:
    op.drop_column("label_templates", "orientation")
