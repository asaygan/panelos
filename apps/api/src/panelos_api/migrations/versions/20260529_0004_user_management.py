"""user_management: membership status/scope, user profile fields, audit actions

Revision ID: 20260529_0004
Revises: 20260529_0003
Create Date: 2026-05-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260529_0004"
down_revision = "20260529_0003"
branch_labels = None
depends_on = None


_NEW_AUDIT_ACTIONS = [
    "user.role_changed",
    "user.suspended",
    "user.activated",
    "user.invite_resent",
    "user.locations_assigned",
]


def upgrade() -> None:
    # --- new audit_action enum values (must be committed before use) ---
    for value in _NEW_AUDIT_ACTIONS:
        op.execute(f"ALTER TYPE audit_action ADD VALUE IF NOT EXISTS '{value}';")

    # --- membership columns ---
    op.add_column(
        "memberships",
        sa.Column("status", sa.String(16), nullable=False, server_default="active"),
    )
    op.add_column(
        "memberships",
        sa.Column(
            "invited_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "memberships", sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "memberships", sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True)
    )

    # backfill status from accepted_at
    op.execute(
        "UPDATE memberships SET status = CASE "
        "WHEN accepted_at IS NULL THEN 'invited' ELSE 'active' END"
    )

    # --- user profile columns ---
    op.add_column("users", sa.Column("avatar_url", sa.String(500), nullable=True))
    op.add_column(
        "users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True)
    )

    # --- membership_location_access join table ---
    op.create_table(
        "membership_location_access",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "company_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("companies.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "membership_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("memberships.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "location_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("locations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint(
            "membership_id", "location_id", name="uq_membership_location_access_membership_id"
        ),
    )
    op.create_index(
        "ix_membership_location_access_company_id",
        "membership_location_access",
        ["company_id"],
    )
    op.create_index(
        "ix_membership_location_access_membership_id",
        "membership_location_access",
        ["membership_id"],
    )

    op.execute("ALTER TABLE membership_location_access ENABLE ROW LEVEL SECURITY;")
    op.execute(
        """
        CREATE POLICY tenant_isolation_membership_location_access ON membership_location_access
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
    op.execute(
        "DROP POLICY IF EXISTS tenant_isolation_membership_location_access "
        "ON membership_location_access;"
    )
    op.drop_table("membership_location_access")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "avatar_url")
    op.drop_column("memberships", "last_active_at")
    op.drop_column("memberships", "suspended_at")
    op.drop_column("memberships", "invited_by_user_id")
    op.drop_column("memberships", "status")
    # enum values cannot be dropped in postgres; left in place.
