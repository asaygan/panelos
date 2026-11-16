"""session_families: refresh-token families for reuse detection + rotation grace.

Revision ID: 20261117_0011
Revises: 20261117_0010
Create Date: 2026-11-17

``family_id`` groups every refresh token descended from one login, so logout
and reuse detection can revoke the whole chain. ``rotated_at`` marks a token
that was exchanged (as opposed to logged out) so the exchange can be repeated
for a few seconds by parallel requests.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20261117_0011"
down_revision = "20261117_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("sessions", sa.Column("rotated_at", sa.DateTime(timezone=True), nullable=True))
    # Existing tokens each become their own family.
    op.execute("UPDATE sessions SET family_id = id WHERE family_id IS NULL")
    op.alter_column("sessions", "family_id", nullable=False)
    op.create_index("ix_sessions_family_id", "sessions", ["family_id"])


def downgrade() -> None:
    op.drop_index("ix_sessions_family_id", table_name="sessions")
    op.drop_column("sessions", "rotated_at")
    op.drop_column("sessions", "family_id")
