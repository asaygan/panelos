"""Append-only history of System Group lifecycle transitions."""

from __future__ import annotations

import uuid

from sqlalchemy import Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin
from panelos_api.db.models.lifecycle import LifecycleStatus


class GroupStatusHistory(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "group_status_history"
    __table_args__ = (
        Index("ix_group_status_history_group_created", "system_group_id", "created_at"),
    )

    system_group_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("system_groups.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_status: Mapped[LifecycleStatus | None] = mapped_column(
        Enum(
            LifecycleStatus,
            name="lifecycle_status",
            create_type=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=True,
    )
    to_status: Mapped[LifecycleStatus] = mapped_column(
        Enum(
            LifecycleStatus,
            name="lifecycle_status",
            create_type=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(String(1000), nullable=True)
