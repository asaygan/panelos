"""Component (BOM row) schemas."""

import uuid

from panelos_api.api.v1.schemas.common import ORMModel


class ComponentOut(ORMModel):
    id: uuid.UUID
    revision_id: uuid.UUID
    slot: str
    ref: str
    description: str
    part_number: str | None = None
    rating: str | None = None
    type: str | None = None
    status: str


class ComponentCreateIn(ORMModel):
    slot: str
    ref: str
    description: str
    part_number: str | None = None
    rating: str | None = None
    type: str | None = None
    status: str = "ok"


class ComponentUpdateIn(ORMModel):
    slot: str | None = None
    ref: str | None = None
    description: str | None = None
    part_number: str | None = None
    rating: str | None = None
    type: str | None = None
    status: str | None = None
