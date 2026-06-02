"""Append-only history of panel lifecycle status transitions.

Every ``panel_service`` status change writes both an audit log entry (chained,
tamper-evident) AND a row here. The history table exists so the UI can render a
fast per-panel timeline without scanning the full audit log. ``from_status``
is NULL only for the initial row (panel creation).
"""

from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin
from panelos_api.db.models.panel import PanelStatus


class PanelStatusHistory(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "panel_status_history"
    __table_args__ = (
        Index("ix_panel_status_history_panel_created", "panel_id", "created_at"),
    )

    panel_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status: Mapped[PanelStatus | None] = mapped_column(
        Enum(
            PanelStatus,
            name="panel_lifecycle_status",
            create_type=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=True,
    )
    to_status: Mapped[PanelStatus] = mapped_column(
        Enum(
            PanelStatus,
            name="panel_lifecycle_status",
            create_type=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
