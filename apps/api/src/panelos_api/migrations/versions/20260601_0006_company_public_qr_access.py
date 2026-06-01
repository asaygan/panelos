"""company_public_qr_access: add companies.public_qr_access_enabled

Revision ID: 20260601_0006
Revises: 20260601_0005
Create Date: 2026-06-01

Additive, NOT NULL with server_default true → safe on prod (existing rows keep
the current public-scan behavior).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260601_0006"
down_revision = "20260601_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column(
            "public_qr_access_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
    )


def downgrade() -> None:
    op.drop_column("companies", "public_qr_access_enabled")
