"""In-app notifications addressed to one member of one company."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Notification(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "notifications"
    __table_args__ = (Index("ix_notifications_user_unread", "user_id", "read_at", "created_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Template key (core.mail_templates): the client renders the text in the
    # viewer's language from ``kind`` + ``params``.
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    params: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    # In-app path to open, e.g. /panels/<id>?tab=issues
    link: Mapped[str | None] = mapped_column(String(300), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
