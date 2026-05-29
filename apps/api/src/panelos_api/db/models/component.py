"""Per-revision components (BOM rows)."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TimestampMixin, UUIDPKMixin


class Component(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "components"

    revision_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panel_revisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slot: Mapped[str] = mapped_column(String(20), nullable=False)
    ref: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str] = mapped_column(String(300), nullable=False)
    part_number: Mapped[str | None] = mapped_column(String(120), nullable=True)
    rating: Mapped[str | None] = mapped_column(String(60), nullable=True)
    type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="ok")
