"""System Group — functional grouping inside a Project (MCC / LVDP / PLC / …).

A Project contains one or more System Groups; each group contains Panels.

Group types reflect real industrial electrical-system terminology so users can
read the tree the same way they would on a single-line diagram. CUSTOM is the
escape hatch for everything that doesn't fit a standard category.
"""

from __future__ import annotations

import uuid
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin
from panelos_api.db.models.lifecycle import LifecycleStatus


class GroupType(StrEnum):
    MCC = "mcc"
    LVDP = "lvdp"
    MV = "mv"
    PLC = "plc"
    PFC = "pfc"
    UPS = "ups"
    SCADA = "scada"
    DCS = "dcs"
    CUSTOM = "custom"


class SystemGroup(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "system_groups"
    __table_args__ = (
        UniqueConstraint("project_id", "code", name="uq_system_group_project_code"),
        Index("ix_system_group_project", "project_id"),
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    group_type: Mapped[GroupType] = mapped_column(
        Enum(
            GroupType,
            name="group_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=GroupType.CUSTOM,
    )
    lifecycle_status: Mapped[LifecycleStatus] = mapped_column(
        Enum(
            LifecycleStatus,
            name="lifecycle_status",
            create_type=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=LifecycleStatus.DRAFT,
    )
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
