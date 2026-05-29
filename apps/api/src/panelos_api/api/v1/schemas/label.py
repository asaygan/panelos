"""Label schemas."""

import uuid

from pydantic import Field

from panelos_api.api.v1.schemas.common import ORMModel


class LabelRenderIn(ORMModel):
    panel_id: uuid.UUID
    template: str = "engraved"
    format: str = "png"
    size: str = "90x50"
    fields: dict[str, bool] = Field(default_factory=dict)
    template_id: uuid.UUID | None = None


class LabelOut(ORMModel):
    id: uuid.UUID
    panel_id: uuid.UUID
    template: str
    format: str
    size: str
    output_storage_key: str | None = None
    png_url: str | None = None
    svg_url: str | None = None


class BatchRenderIn(ORMModel):
    panel_ids: list[uuid.UUID]
    template: str = "engraved"
    template_id: uuid.UUID | None = None


class BatchRenderOut(ORMModel):
    pdf_url: str | None = None
    count: int
