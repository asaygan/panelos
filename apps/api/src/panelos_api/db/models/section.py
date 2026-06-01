"""Section — a functional part inside a Panel (e.g. "Incoming Section", "VFD Section").

Sections are ordered within a panel and typed via ``SectionType``. They have NO QR
token and NO revisions (panel content/revisions live at the Panel level). ``company_id``
is denormalized from the parent panel so the standard per-tenant RLS policy applies.
"""

from __future__ import annotations

import uuid
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class SectionType(StrEnum):
    INCOMING = "incoming"
    DISTRIBUTION = "distribution"
    FEEDER = "feeder"
    VFD = "vfd"
    SOFTSTARTER = "softstarter"
    CAPACITOR = "capacitor"
    METERING = "metering"
    PLC_CPU = "plc_cpu"
    PLC_IO = "plc_io"
    NETWORK = "network"
    UPS = "ups"
    TERMINAL = "terminal"
    HMI = "hmi"
    PROTECTION = "protection"
    GENERATOR = "generator"
    CUSTOM = "custom"


class Section(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint("panel_id", "position", name="uq_section_panel_position"),
        Index("ix_section_panel_position", "panel_id", "position"),
    )

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section_type: Mapped[SectionType] = mapped_column(
        Enum(
            SectionType,
            name="section_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
