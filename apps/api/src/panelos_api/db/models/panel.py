"""Panels — immutable identity, mutable metadata, QR-token tagged.

Panels live under a System Group (which lives under a Project). Cabinets live
underneath the Panel. QR exists ONLY at the Panel level.

Lifecycle status was removed from Panel in migration 0009; it now lives on the
Project + System Group. PanelOS is asset management, not SCADA — panels carry
no operational/runtime status field at all.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Panel(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "panels"
    __table_args__ = (
        UniqueConstraint("company_id", "serial", name="uq_panel_company_serial"),
        UniqueConstraint("qr_token", name="uq_panel_qr_token"),
    )

    system_group_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("system_groups.id", ondelete="SET NULL"), nullable=True, index=True
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

    installed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
