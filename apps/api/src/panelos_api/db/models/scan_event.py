"""QR scan events — also forms the audit base for field activity."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, UUIDPKMixin


class ScanEvent(UUIDPKMixin, Base):
    __tablename__ = "scan_events"
    __table_args__ = (Index("ix_scan_panel_at", "panel_id", "at"),)

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    revision_id_served: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("panel_revisions.id", ondelete="SET NULL"), nullable=True
    )
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    geo: Mapped[str | None] = mapped_column(String(120), nullable=True)
    device: Mapped[str | None] = mapped_column(String(200), nullable=True)
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
