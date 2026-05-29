"""Junction: revision ↔ pdf_file with sheet metadata."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TimestampMixin, UUIDPKMixin


class RevisionFile(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "revision_files"

    revision_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panel_revisions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("pdf_files.id", ondelete="RESTRICT"), nullable=False
    )
    sheet_number: Mapped[str] = mapped_column(String(20), nullable=False)
    sheet_title: Mapped[str] = mapped_column(String(200), nullable=False)
    page_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
