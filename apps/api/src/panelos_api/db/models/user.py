"""User identity."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TimestampMixin, UUIDPKMixin


class User(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # TOTP secret, encrypted at rest (core.crypto). Set by /auth/mfa/setup; MFA
    # is only enforced at login once ``mfa_enabled`` is True (code confirmed).
    mfa_secret: Mapped[str | None] = mapped_column(Text, nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # sha256 hashes of unused one-time recovery codes.
    mfa_recovery_codes: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default="[]"
    )
    locale: Mapped[str] = mapped_column(
        String(5), nullable=False, default="tr", server_default="tr"
    )
    password_changed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # {"email": {"<kind>": bool}, "in_app": {"<kind>": bool}}; missing = enabled.
    notification_prefs: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default="{}"
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
