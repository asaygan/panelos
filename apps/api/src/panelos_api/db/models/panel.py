"""Panels — immutable identity, mutable metadata, QR-token tagged."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class PanelStatus(StrEnum):
    """Panel **lifecycle** status (not operational/SCADA).

    Tracks where a panel is in its asset lifecycle from design through retirement.
    Free transitions between values are allowed; every change is audited and
    recorded in ``panel_status_history`` so the timeline can be replayed later.
    """

    DRAFT = "draft"
    ENGINEERING = "engineering"
    RELEASED = "released"
    INSTALLED = "installed"
    COMMISSIONED = "commissioned"
    IN_SERVICE = "in_service"
    ARCHIVED = "archived"


class Panel(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "panels"
    __table_args__ = (
        UniqueConstraint("company_id", "serial", name="uq_panel_company_serial"),
        UniqueConstraint("qr_token", name="uq_panel_qr_token"),
        Index("ix_panel_company_status", "company_id", "status"),
    )

    panel_set_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("panel_sets.id", ondelete="SET NULL"), nullable=True, index=True
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    active_revision_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("panel_revisions.id", ondelete="SET NULL", use_alter=True),
        nullable=True,
    )

    tag: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    serial: Mapped[str] = mapped_column(String(80), nullable=False)
    qr_token: Mapped[str] = mapped_column(String(32), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    area: Mapped[str | None] = mapped_column(String(120), nullable=True)
    voltage: Mapped[str | None] = mapped_column(String(40), nullable=True)
    current_a: Mapped[str | None] = mapped_column(String(40), nullable=True)
    phase: Mapped[str | None] = mapped_column(String(40), nullable=True)
    mfr: Mapped[str | None] = mapped_column(String(120), nullable=True)
    customer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    enclosure: Mapped[str | None] = mapped_column(String(80), nullable=True)
    ip_class: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)

    status: Mapped[PanelStatus] = mapped_column(
        Enum(
            PanelStatus,
            # New enum name to replace the old operational `panel_status`
            # (ok/warn/fault/idle). Migration 0008 swaps the column over.
            name="panel_lifecycle_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=PanelStatus.DRAFT,
    )

    installed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
