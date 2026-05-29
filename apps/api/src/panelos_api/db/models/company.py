"""Company (tenant root)."""

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TimestampMixin, UUIDPKMixin


class Company(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "companies"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    short_name: Mapped[str | None] = mapped_column(String(40), nullable=True)
    standards_profile: Mapped[str | None] = mapped_column(String(80), nullable=True)
    logo_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
