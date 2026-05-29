"""Plant/facility locations."""

from __future__ import annotations

from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class Location(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "locations"
    __table_args__ = (UniqueConstraint("company_id", "code", name="uq_location_company_code"),)

    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
