"""Panel schemas. Panel sits under a System Group, has no lifecycle status."""

import uuid
from datetime import datetime

from panelos_api.api.v1.schemas.common import ORMModel


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
    active_revision_id: uuid.UUID | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


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
