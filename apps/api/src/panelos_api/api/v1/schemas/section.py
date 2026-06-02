"""Section schemas."""

import uuid
from datetime import datetime

from panelos_api.api.v1.schemas.common import ORMModel
from panelos_api.db.models.section import SectionType

__all__ = [
    "SectionCreateIn",
    "SectionMoveIn",
    "SectionOut",
    "SectionType",
    "SectionUpdateIn",
]


class SectionOut(ORMModel):
    id: uuid.UUID
    panel_id: uuid.UUID
    section_type: SectionType
    name: str
    position: int
    description: str | None = None
    created_at: datetime
    updated_at: datetime


class SectionCreateIn(ORMModel):
    name: str
    # Optional for quick-create: defaults to CUSTOM when omitted.
    section_type: SectionType = SectionType.CUSTOM
    description: str | None = None
    position: int | None = None


class SectionUpdateIn(ORMModel):
    section_type: SectionType | None = None
    name: str | None = None
    description: str | None = None
    position: int | None = None


class SectionMoveIn(ORMModel):
    """Reparent a section to a different panel (same company)."""

    panel_id: uuid.UUID
