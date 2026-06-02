"""Project + System Group + Cabinet schemas + the assembled asset tree."""

import uuid
from datetime import datetime

from pydantic import Field

from panelos_api.api.v1.schemas.common import ORMModel
from panelos_api.api.v1.schemas.panel import PanelOut
from panelos_api.db.models.lifecycle import LifecycleStatus
from panelos_api.db.models.system_group import GroupType

__all__ = [
    "CabinetCreateIn",
    "CabinetMoveIn",
    "CabinetOut",
    "CabinetUpdateIn",
    "GroupType",
    "LifecycleHistoryOut",
    "LifecycleStatus",
    "PanelNode",
    "ProjectCreateIn",
    "ProjectOut",
    "ProjectStatusHistoryOut",
    "ProjectUpdateIn",
    "SystemGroupCreateIn",
    "SystemGroupNode",
    "SystemGroupOut",
    "SystemGroupStatusHistoryOut",
    "SystemGroupUpdateIn",
    "TreeOut",
]


# ─── Project ───────────────────────────────────────────────────────────────


class ProjectOut(ORMModel):
    id: uuid.UUID
    name: str
    code: str | None = None
    customer: str | None = None
    site: str | None = None
    description: str | None = None
    location_id: uuid.UUID | None = None
    lifecycle_status: LifecycleStatus
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ProjectCreateIn(ORMModel):
    name: str
    code: str | None = None
    customer: str | None = None
    site: str | None = None
    description: str | None = None
    location_id: uuid.UUID | None = None
    lifecycle_status: LifecycleStatus = LifecycleStatus.DRAFT


class ProjectUpdateIn(ORMModel):
    name: str | None = None
    code: str | None = None
    customer: str | None = None
    site: str | None = None
    description: str | None = None
    location_id: uuid.UUID | None = None
    lifecycle_status: LifecycleStatus | None = None


# ─── System Group ──────────────────────────────────────────────────────────


class SystemGroupOut(ORMModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    code: str | None = None
    group_type: GroupType
    lifecycle_status: LifecycleStatus
    description: str | None = None
    created_at: datetime
    updated_at: datetime


class SystemGroupCreateIn(ORMModel):
    name: str
    code: str | None = None
    group_type: GroupType = GroupType.CUSTOM
    lifecycle_status: LifecycleStatus = LifecycleStatus.DRAFT
    description: str | None = None


class SystemGroupUpdateIn(ORMModel):
    name: str | None = None
    code: str | None = None
    group_type: GroupType | None = None
    lifecycle_status: LifecycleStatus | None = None
    description: str | None = None
    project_id: uuid.UUID | None = None


# ─── Cabinet ───────────────────────────────────────────────────────────────


class CabinetOut(ORMModel):
    id: uuid.UUID
    panel_id: uuid.UUID
    name: str
    code: str | None = None
    position: int
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class CabinetCreateIn(ORMModel):
    name: str
    code: str | None = None
    position: int | None = None
    notes: str | None = None


class CabinetUpdateIn(ORMModel):
    name: str | None = None
    code: str | None = None
    position: int | None = None
    notes: str | None = None


class CabinetMoveIn(ORMModel):
    """Reparent a cabinet to a different panel (same company)."""

    panel_id: uuid.UUID


# ─── Lifecycle status history ──────────────────────────────────────────────


class LifecycleHistoryOut(ORMModel):
    """Generic lifecycle history row; from_status is None for the initial entry."""

    id: uuid.UUID
    from_status: LifecycleStatus | None = None
    to_status: LifecycleStatus
    changed_by: uuid.UUID | None = None
    note: str | None = None
    created_at: datetime


class ProjectStatusHistoryOut(LifecycleHistoryOut):
    project_id: uuid.UUID


class SystemGroupStatusHistoryOut(LifecycleHistoryOut):
    system_group_id: uuid.UUID


# ─── Tree (Project → System Group → Panel → Cabinet) ───────────────────────


class PanelNode(PanelOut):
    cabinets: list[CabinetOut] = Field(default_factory=list)


class SystemGroupNode(SystemGroupOut):
    panels: list[PanelNode] = Field(default_factory=list)


class ProjectNode(ProjectOut):
    groups: list[SystemGroupNode] = Field(default_factory=list)


class TreeOut(ORMModel):
    projects: list[ProjectNode] = Field(default_factory=list)
    # Panels whose system_group_id has been cleared (set NULL).
    unassigned_panels: list[PanelNode] = Field(default_factory=list)
