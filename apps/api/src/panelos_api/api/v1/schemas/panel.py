"""Panel schemas. Panel sits under a System Group, has no lifecycle status."""

import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from panelos_api.api.v1.schemas.common import ORMModel


class RevisionRef(BaseModel):
    id: uuid.UUID
    letter: str
    status: str


class PanelOut(ORMModel):
    id: uuid.UUID
    tag: str
    serial: str
    name: str
    qr_token: str
    system_group_id: uuid.UUID | None = None
    location_id: uuid.UUID | None
    voltage: str | None = None
    current_a: str | None = None
    phase: str | None = None
    mfr: str | None = None
    customer: str | None = None
    enclosure: str | None = None
    area: str | None = None
    ip_class: str | None = None
    notes: str | None = None
    installed_at: datetime | None = None
    active_revision_id: uuid.UUID | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # ── Derived (filled by services.panel_presenter in one batch per list) ──
    location_name: str | None = None
    group_name: str | None = None
    project_id: uuid.UUID | None = None
    project_name: str | None = None
    # Documentation state: is there an approved schematic revision in the field?
    doc_status: Literal["approved", "in_review", "draft", "none"] = "none"
    active_revision: RevisionRef | None = None
    pending_revision: RevisionRef | None = None
    open_issue_count: int = 0
    worst_open_severity: str | None = None
    last_scan_at: datetime | None = None
    next_maintenance_on: date | None = None
    maintenance_overdue: bool = False
    cabinet_count: int = 0


class PanelCreateIn(ORMModel):
    name: str
    # Optional for ClickUp-style quick-create: when omitted the server derives a
    # unique tag (slug of name) and a unique serial. Provided values win.
    tag: str | None = None
    serial: str | None = None
    system_group_id: uuid.UUID | None = None
    location_id: uuid.UUID | None = None
    voltage: str | None = None
    current_a: str | None = None
    phase: str | None = None
    mfr: str | None = None
    customer: str | None = None
    enclosure: str | None = None
    area: str | None = None
    ip_class: str | None = None
    notes: str | None = None
    installed_at: datetime | None = None


class PanelUpdateIn(ORMModel):
    name: str | None = None
    tag: str | None = None
    system_group_id: uuid.UUID | None = None
    location_id: uuid.UUID | None = None
    voltage: str | None = None
    current_a: str | None = None
    phase: str | None = None
    mfr: str | None = None
    customer: str | None = None
    enclosure: str | None = None
    area: str | None = None
    ip_class: str | None = None
    notes: str | None = None
    installed_at: datetime | None = None
