"""Panel Set schemas + the Panel Set → Panel → Section tree."""

import uuid
from datetime import datetime

from pydantic import Field

from panelos_api.api.v1.schemas.common import ORMModel
from panelos_api.api.v1.schemas.panel import PanelOut
from panelos_api.api.v1.schemas.section import SectionOut


class PanelSetOut(ORMModel):
    id: uuid.UUID
    name: str
    code: str | None = None
    description: str | None = None
    location_id: uuid.UUID | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class PanelSetCreateIn(ORMModel):
    name: str
    code: str | None = None
    description: str | None = None
    location_id: uuid.UUID | None = None


class PanelSetUpdateIn(ORMModel):
    name: str | None = None
    code: str | None = None
    description: str | None = None
    location_id: uuid.UUID | None = None


# ── Tree shapes (Panel Set → Panel → Section) ─────────────────────────────────


class PanelNode(PanelOut):
    sections: list[SectionOut] = Field(default_factory=list)


class PanelSetNode(PanelSetOut):
    panels: list[PanelNode] = Field(default_factory=list)


class TreeOut(ORMModel):
    panel_sets: list[PanelSetNode] = Field(default_factory=list)
    # Panels not yet assigned to any set (panel_set_id IS NULL).
    unassigned_panels: list[PanelNode] = Field(default_factory=list)
