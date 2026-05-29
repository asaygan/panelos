"""Rendered label instances."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Label(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "labels"

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    revision_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("panel_revisions.id", ondelete="SET NULL"), nullable=True
    )
    template: Mapped[str] = mapped_column(String(40), nullable=False)
    size: Mapped[str] = mapped_column(String(20), nullable=False)
    fields_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    output_storage_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    format: Mapped[str] = mapped_column(String(10), nullable=False, default="png")
