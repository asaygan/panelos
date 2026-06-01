"""Panel Set — a facility / process system / panel group (top of the asset tree).

A Panel Set groups physical Panels (e.g. "Water Treatment Plant Electrical System").
It has NO QR token. Panel-Set revisions are intentionally deferred to a follow-up, so
there is no ``active_revision_id`` here yet.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class PanelSet(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "panel_sets"
    __table_args__ = (
        UniqueConstraint("company_id", "code", name="uq_panel_set_company_code"),
    )

    location_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("locations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
