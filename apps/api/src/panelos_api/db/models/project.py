"""Project — top of the industrial asset tree.

A Project is a facility / site (e.g. "Haddehane", "Water Treatment Plant"). It
groups System Groups (MCC/LVDP/PLC/…), which in turn group Panels, which in
turn group Cabinets.

QR codes live ONLY at the Panel level. Projects have NO QR. Lifecycle status
(draft → engineering → released → installed → commissioned → in_service →
archived) is tracked at the Project and Group level — NOT at the Panel level
(PanelOS is asset-management, not SCADA).

This table replaces the legacy ``panel_sets`` table (renamed in migration 0009).
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin
from panelos_api.db.models.lifecycle import LifecycleStatus


class Project(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_project_company_code"),
    )

    location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    customer: Mapped[str | None] = mapped_column(String(200), nullable=True)
    site: Mapped[str | None] = mapped_column(String(200), nullable=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    lifecycle_status: Mapped[LifecycleStatus] = mapped_column(
        Enum(
            LifecycleStatus,
            name="lifecycle_status",
            create_type=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=LifecycleStatus.DRAFT,
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
