"""Pending invitations."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.core.rbac import Role
from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Invitation(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "invitations"

    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="role", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    token: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
