"""Revision history per panel — state machine + immutability."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TimestampMixin, UUIDPKMixin


class RevisionStatus(StrEnum):
    DRAFT = "draft"
    REVIEW = "review"
    APPROVED = "approved"
    SUPERSEDED = "superseded"
    REJECTED = "rejected"


class PanelRevision(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "panel_revisions"
    __table_args__ = (
        UniqueConstraint("panel_id", "revision_number", name="uq_revision_panel_number"),
        Index("ix_revision_panel_number_desc", "panel_id", "revision_number"),
    )

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True
    )

    revision_letter: Mapped[str] = mapped_column(String(4), nullable=False)
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[RevisionStatus] = mapped_column(
        Enum(
            RevisionStatus,
            name="revision_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=RevisionStatus.DRAFT,
    )
    change_summary: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    created_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    submitted_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    superseded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rejected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
