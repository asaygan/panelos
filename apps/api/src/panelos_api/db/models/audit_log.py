"""Tamper-evident audit log with SHA-256 hash chain."""

from __future__ import annotations

import uuid
from enum import StrEnum
from typing import Any

from sqlalchemy import Enum, ForeignKey, Index, LargeBinary, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class AuditAction(StrEnum):
    PANEL_CREATED = "panel.created"
    PANEL_UPDATED = "panel.updated"
    PANEL_ARCHIVED = "panel.archived"
    # NB: ``panel.status_changed`` is kept in the enum so historical audit rows
    # (pre-migration 0009, when Panel still carried lifecycle status) remain
    # readable, but new code never emits it. New lifecycle actions live below.
    PANEL_STATUS_CHANGED = "panel.status_changed"
    PANEL_SET_CREATED = "panel_set.created"
    PANEL_SET_UPDATED = "panel_set.updated"
    PANEL_SET_ARCHIVED = "panel_set.archived"
    SECTION_CREATED = "section.created"
    SECTION_UPDATED = "section.updated"
    SECTION_DELETED = "section.deleted"
    # New hierarchy (migration 0009) — Project → System Group → Panel → Cabinet.
    PROJECT_CREATED = "project.created"
    PROJECT_UPDATED = "project.updated"
    PROJECT_ARCHIVED = "project.archived"
    PROJECT_STATUS_CHANGED = "project.status_changed"
    SYSTEM_GROUP_CREATED = "system_group.created"
    SYSTEM_GROUP_UPDATED = "system_group.updated"
    SYSTEM_GROUP_DELETED = "system_group.deleted"
    SYSTEM_GROUP_STATUS_CHANGED = "system_group.status_changed"
    CABINET_CREATED = "cabinet.created"
    CABINET_UPDATED = "cabinet.updated"
    CABINET_DELETED = "cabinet.deleted"
    REVISION_CREATED = "revision.created"
    REVISION_SUBMITTED = "revision.submitted"
    REVISION_APPROVED = "revision.approved"
    REVISION_REJECTED = "revision.rejected"
    REVISION_SUPERSEDED = "revision.superseded"
    FILE_UPLOADED = "file.uploaded"
    LABEL_RENDERED = "label.rendered"
    USER_INVITED = "user.invited"
    USER_REMOVED = "user.removed"
    USER_ROLE_CHANGED = "user.role_changed"
    USER_SUSPENDED = "user.suspended"
    USER_ACTIVATED = "user.activated"
    INVITE_RESENT = "user.invite_resent"
    INVITE_ACCEPTED = "user.invite_accepted"
    LOCATIONS_ASSIGNED = "user.locations_assigned"
    LOGIN = "auth.login"
    LOGOUT = "auth.logout"


class AuditLog(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_company_created", "company_id", "created_at"),)

    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[AuditAction] = mapped_column(
        Enum(
            AuditAction,
            name="audit_action",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    target_type: Mapped[str] = mapped_column(String(60), nullable=False)
    target_id: Mapped[str] = mapped_column(String(64), nullable=False)
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    prev_hash: Mapped[bytes] = mapped_column(LargeBinary(32), nullable=False)
    hash: Mapped[bytes] = mapped_column(LargeBinary(32), nullable=False)
