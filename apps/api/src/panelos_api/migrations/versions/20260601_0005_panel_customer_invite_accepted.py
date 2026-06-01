"""panel_customer_invite_accepted: add panels.customer + invite_accepted audit action

Revision ID: 20260601_0005
Revises: 20260529_0004
Create Date: 2026-06-01

Additive + nullable only (safe on prod).
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260601_0005"
down_revision = "20260529_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # New audit_action enum value (idempotent, committed before any use).
    op.execute("ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'user.invite_accepted';")
    # Nullable customer column on panels.
    op.add_column("panels", sa.Column("customer", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("panels", "customer")
    # enum values cannot be dropped in postgres; left in place.
