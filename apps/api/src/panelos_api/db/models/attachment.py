"""Photos / documents attached to a panel, an issue or a maintenance record."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Attachment(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "attachments"
    __table_args__ = (Index("ix_attachments_panel", "panel_id", "created_at"),)

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False
    )
    issue_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), nullable=True, index=True
    )
    maintenance_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("maintenance_records.id", ondelete="CASCADE"), nullable=True, index=True
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pdf_files.id", ondelete="CASCADE"), nullable=False
    )
    caption: Mapped[str | None] = mapped_column(String(300), nullable=True)
    uploaded_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
