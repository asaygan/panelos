"""Per-membership location scoping. Empty set ⇒ organization-wide access."""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class MembershipLocationAccess(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "membership_location_access"
    __table_args__ = (
        UniqueConstraint(
            "membership_id", "location_id", name="uq_membership_location_access_membership_id"
        ),
    )

    membership_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memberships.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("locations.id", ondelete="CASCADE"), nullable=False
    )
