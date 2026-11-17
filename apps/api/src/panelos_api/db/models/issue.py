"""Field issues / faults reported against a panel."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class IssueSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


OPEN_STATUSES = (IssueStatus.OPEN.value, IssueStatus.IN_PROGRESS.value)


class Issue(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "issues"
    __table_args__ = (
        Index("ix_issues_company_status", "company_id", "status"),
        Index("ix_issues_panel", "panel_id", "created_at"),
    )

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False
    )
    # Human-friendly running number per company (ISS-12).
    number: Mapped[int] = mapped_column(nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    reported_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
