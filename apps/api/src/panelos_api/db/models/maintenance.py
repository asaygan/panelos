"""Maintenance history (what was done) and plans (what is due)."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class MaintenanceKind(StrEnum):
    INSPECTION = "inspection"
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    THERMOGRAPHY = "thermography"
    CLEANING = "cleaning"
    TEST = "test"
    OTHER = "other"


class MaintenanceResult(StrEnum):
    OK = "ok"
    ATTENTION = "attention"
    FAIL = "fail"


class MaintenanceRecord(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    """A maintenance / inspection job that was carried out on a panel."""

    __tablename__ = "maintenance_records"
    __table_args__ = (Index("ix_maintenance_panel_at", "panel_id", "performed_at"),)

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False
    )
    plan_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("maintenance_plans.id", ondelete="SET NULL"), nullable=True
    )
    issue_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("issues.id", ondelete="SET NULL"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="inspection")
    result: Mapped[str] = mapped_column(String(12), nullable=False, default="ok")
    summary: Mapped[str] = mapped_column(String(300), nullable=False)
    findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    performed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    performed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # Free text for contractors / people without an account.
    performed_by_name: Mapped[str | None] = mapped_column(String(200), nullable=True)


class MaintenancePlan(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    """A recurring maintenance obligation for a panel."""

    __tablename__ = "maintenance_plans"
    __table_args__ = (Index("ix_maintenance_plans_due", "company_id", "active", "next_due_on"),)

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, default="preventive")
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False)
    next_due_on: Mapped[date] = mapped_column(Date, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The due date we last notified about (so a plan is announced once per cycle).
    notified_for: Mapped[date | None] = mapped_column(Date, nullable=True)
