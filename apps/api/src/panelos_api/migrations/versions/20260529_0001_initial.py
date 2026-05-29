"""initial schema

Revision ID: 20260529_0001
Revises:
Create Date: 2026-05-29
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260529_0001"
down_revision = None
branch_labels = None
depends_on = None


ROLE_ENUM = postgresql.ENUM(
    "owner", "admin", "engineer", "technician", "viewer", name="role", create_type=False
)
PANEL_STATUS_ENUM = postgresql.ENUM(
    "ok", "warn", "fault", "idle", name="panel_status", create_type=False
)
REVISION_STATUS_ENUM = postgresql.ENUM(
    "draft",
    "review",
    "approved",
    "superseded",
    "rejected",
    name="revision_status",
    create_type=False,
)
AUDIT_ACTION_ENUM = postgresql.ENUM(
    "panel.created",
    "panel.updated",
    "panel.archived",
    "revision.created",
    "revision.submitted",
    "revision.approved",
    "revision.rejected",
    "revision.superseded",
    "file.uploaded",
    "label.rendered",
    "user.invited",
    "user.removed",
    "auth.login",
    "auth.logout",
    name="audit_action",
    create_type=False,
)

TENANT_TABLES = [
    "memberships",
    "invitations",
    "locations",
    "panels",
    "pdf_files",
    "labels",
    "label_batches",
    "audit_logs",
    "api_keys",
]


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

    bind = op.get_bind()
    ROLE_ENUM.create(bind, checkfirst=True)
    PANEL_STATUS_ENUM.create(bind, checkfirst=True)
    REVISION_STATUS_ENUM.create(bind, checkfirst=True)
    AUDIT_ACTION_ENUM.create(bind, checkfirst=True)

    op.create_table(
        "companies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("short_name", sa.String(40)),
        sa.Column("standards_profile", sa.String(80)),
        sa.Column("logo_key", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255)),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("mfa_secret", sa.String(64)),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "memberships",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", ROLE_ENUM, nullable=False),
        sa.Column("invited_at", sa.DateTime(timezone=True)),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("company_id", "user_id", name="uq_membership_company_user"),
    )
    op.create_index("ix_memberships_company_id", "memberships", ["company_id"])
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"])

    op.create_table(
        "invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("role", ROLE_ENUM, nullable=False),
        sa.Column("token", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_invitations_company_id", "invitations", ["company_id"])
    op.create_index("ix_invitations_email", "invitations", ["email"])

    op.create_table(
        "sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("device", sa.String(200)),
        sa.Column("revoked_at", sa.DateTime(timezone=True)),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("region", sa.String(120)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("company_id", "code", name="uq_location_company_code"),
    )
    op.create_index("ix_locations_company_id", "locations", ["company_id"])

    op.create_table(
        "panels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("location_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("locations.id", ondelete="SET NULL")),
        sa.Column("active_revision_id", postgresql.UUID(as_uuid=True)),  # FK added after panel_revisions
        sa.Column("tag", sa.String(40), nullable=False),
        sa.Column("serial", sa.String(80), nullable=False),
        sa.Column("qr_token", sa.String(32), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("area", sa.String(120)),
        sa.Column("voltage", sa.String(40)),
        sa.Column("current_a", sa.String(40)),
        sa.Column("phase", sa.String(40)),
        sa.Column("mfr", sa.String(120)),
        sa.Column("enclosure", sa.String(80)),
        sa.Column("ip_class", sa.String(20)),
        sa.Column("notes", sa.String(2000)),
        sa.Column("status", PANEL_STATUS_ENUM, nullable=False, server_default="ok"),
        sa.Column("installed_at", sa.DateTime(timezone=True)),
        sa.Column("archived_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("company_id", "serial", name="uq_panel_company_serial"),
        sa.UniqueConstraint("qr_token", name="uq_panel_qr_token"),
    )
    op.create_index("ix_panels_company_id", "panels", ["company_id"])
    op.create_index("ix_panels_tag", "panels", ["tag"])
    op.create_index("ix_panels_location_id", "panels", ["location_id"])
    op.create_index("ix_panel_company_status", "panels", ["company_id", "status"])

    op.create_table(
        "panel_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("panel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("panels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision_letter", sa.String(4), nullable=False),
        sa.Column("revision_number", sa.Integer, nullable=False),
        sa.Column("status", REVISION_STATUS_ENUM, nullable=False, server_default="draft"),
        sa.Column("change_summary", sa.String(2000)),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("submitted_at", sa.DateTime(timezone=True)),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("superseded_at", sa.DateTime(timezone=True)),
        sa.Column("rejected_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("panel_id", "revision_number", name="uq_revision_panel_number"),
    )
    op.create_index("ix_panel_revisions_panel_id", "panel_revisions", ["panel_id"])
    op.create_index(
        "ix_revision_panel_number_desc",
        "panel_revisions",
        ["panel_id", sa.text("revision_number DESC")],
    )

    op.create_foreign_key(
        "fk_panels_active_revision_id_panel_revisions",
        "panels",
        "panel_revisions",
        ["active_revision_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "pdf_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("storage_provider", sa.String(20), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("byte_size", sa.Integer, nullable=False),
        sa.Column("mime", sa.String(120), nullable=False),
        sa.Column("original_filename", sa.String(300), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_pdf_files_company_id", "pdf_files", ["company_id"])
    op.create_index("ix_pdf_files_storage_key", "pdf_files", ["storage_key"])
    op.create_index("ix_pdf_files_sha256", "pdf_files", ["sha256"])

    op.create_table(
        "revision_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("panel_revisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pdf_files.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("sheet_number", sa.String(20), nullable=False),
        sa.Column("sheet_title", sa.String(200), nullable=False),
        sa.Column("page_index", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_revision_files_revision_id", "revision_files", ["revision_id"])

    op.create_table(
        "components",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("panel_revisions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("slot", sa.String(20), nullable=False),
        sa.Column("ref", sa.String(40), nullable=False),
        sa.Column("description", sa.String(300), nullable=False),
        sa.Column("part_number", sa.String(120)),
        sa.Column("rating", sa.String(60)),
        sa.Column("type", sa.String(40)),
        sa.Column("status", sa.String(16), nullable=False, server_default="ok"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_components_revision_id", "components", ["revision_id"])

    op.create_table(
        "labels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("panel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("panels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("panel_revisions.id", ondelete="SET NULL")),
        sa.Column("template", sa.String(40), nullable=False),
        sa.Column("size", sa.String(20), nullable=False),
        sa.Column("fields_json", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("output_storage_key", sa.String(500)),
        sa.Column("format", sa.String(10), nullable=False, server_default="png"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_labels_company_id", "labels", ["company_id"])
    op.create_index("ix_labels_panel_id", "labels", ["panel_id"])

    op.create_table(
        "label_batches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("items_json", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("status", sa.String(20), nullable=False, server_default="queued"),
        sa.Column("output_storage_key", sa.String(500)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_label_batches_company_id", "label_batches", ["company_id"])

    op.create_table(
        "scan_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("panel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("panels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("revision_id_served", postgresql.UUID(as_uuid=True), sa.ForeignKey("panel_revisions.id", ondelete="SET NULL")),
        sa.Column("ip", sa.String(64)),
        sa.Column("geo", sa.String(120)),
        sa.Column("device", sa.String(200)),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_scan_events_panel_id", "scan_events", ["panel_id"])
    op.create_index("ix_scan_panel_at", "scan_events", ["panel_id", sa.text("at DESC")])

    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("action", AUDIT_ACTION_ENUM, nullable=False),
        sa.Column("target_type", sa.String(60), nullable=False),
        sa.Column("target_id", sa.String(64), nullable=False),
        sa.Column("meta", postgresql.JSONB, nullable=False, server_default="{}"),
        sa.Column("prev_hash", sa.LargeBinary(32), nullable=False),
        sa.Column("hash", sa.LargeBinary(32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_logs_company_id", "audit_logs", ["company_id"])
    op.create_index(
        "ix_audit_company_created", "audit_logs", ["company_id", sa.text("created_at DESC")]
    )

    op.create_table(
        "api_keys",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("company_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("companies.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("prefix", sa.String(16), nullable=False),
        sa.Column("secret_hash", sa.String(128), nullable=False),
        sa.Column("scopes", postgresql.JSONB, nullable=False, server_default="[]"),
        sa.Column("last_used_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_api_keys_company_id", "api_keys", ["company_id"])
    op.create_index("ix_api_keys_prefix", "api_keys", ["prefix"])

    # Trigger preventing UPDATE of panels.qr_token.
    op.execute(
        """
        CREATE OR REPLACE FUNCTION panelos_qr_token_immutable() RETURNS trigger AS $$
        BEGIN
          IF NEW.qr_token IS DISTINCT FROM OLD.qr_token THEN
            RAISE EXCEPTION 'panels.qr_token is immutable';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_panels_qr_token_immutable
        BEFORE UPDATE ON panels
        FOR EACH ROW EXECUTE FUNCTION panelos_qr_token_immutable();
        """
    )

    # Row-level security on tenant-scoped tables.
    for t in TENANT_TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;")
        op.execute(
            f"""
            CREATE POLICY tenant_isolation_{t} ON {t}
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
    for t in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation_{t} ON {t};")
    op.execute("DROP TRIGGER IF EXISTS trg_panels_qr_token_immutable ON panels;")
    op.execute("DROP FUNCTION IF EXISTS panelos_qr_token_immutable();")

    for t in [
        "api_keys",
        "audit_logs",
        "scan_events",
        "label_batches",
        "labels",
        "components",
        "revision_files",
        "pdf_files",
    ]:
        op.drop_table(t)
    op.drop_constraint(
        "fk_panels_active_revision_id_panel_revisions", "panels", type_="foreignkey"
    )
    op.drop_table("panel_revisions")
    op.drop_table("panels")
    op.drop_table("locations")
    op.drop_table("sessions")
    op.drop_table("invitations")
    op.drop_table("memberships")
    op.drop_table("users")
    op.drop_table("companies")

    bind = op.get_bind()
    AUDIT_ACTION_ENUM.drop(bind, checkfirst=True)
    REVISION_STATUS_ENUM.drop(bind, checkfirst=True)
    PANEL_STATUS_ENUM.drop(bind, checkfirst=True)
    ROLE_ENUM.drop(bind, checkfirst=True)
