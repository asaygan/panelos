"""Cabinet — physical compartment inside a Panel (C1, C2, "Incoming", …).

A Panel contains an ordered list of Cabinets. Cabinets have NO QR (future
follow-up) and NO revisions (revisions are a Panel concept). This table
replaces the legacy ``sections`` table (renamed in migration 0009), and the
``section_type`` enum is dropped — cabinets carry only name + code + notes.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Cabinet(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "cabinets"
    __table_args__ = (
        UniqueConstraint("panel_id", "position", name="uq_cabinet_panel_position"),
        Index("ix_cabinet_panel_position", "panel_id", "position"),
    )

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    notes: Mapped[str | None] = mapped_column(String(2000), nullable=True)
