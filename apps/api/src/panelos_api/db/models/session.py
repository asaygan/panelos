"""Refresh-token sessions. Class renamed to avoid clash with sqlalchemy ``Session``."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TimestampMixin, UUIDPKMixin


class UserSession(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    device: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # All refresh tokens descended from one login share a family, so logout and
    # reuse detection can revoke the whole chain.
    family_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True, default=uuid.uuid4)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Set when the token was exchanged for a new one (vs. logged out).
    rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
