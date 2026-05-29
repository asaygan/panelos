"""Label template schemas (Layout Schema v2).

``layout_json`` carries a v2 layout document — millimetre coordinates rendered
identically by backend and web. See ``docs/design/label-layout-schema.md``::

    {
      "version": 2,
      "orientation": "landscape" | "portrait",
      "size_mm": { "w": 90, "h": 50 },
      "background": { "kind": "engraved" | "plain", "fill": "#hex", "radius_mm": 1.8 },
      "grid_mm": 1,
      "elements": [ Element, ... ]   // type ∈ field|text|qr|logo|line|box
    }

The pydantic models below are permissive (``extra="allow"``) so the visual
editor can add element keys without a backend change, but writes are validated
to be well-formed v2 (``version==2``, valid ``size_mm`` + element ``type``s).
"""

import uuid
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from panelos_api.api.v1.schemas.common import ORMModel
from panelos_api.labels.layout import is_v2_layout


class _ElementBase(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str
    x: float = 0
    y: float = 0
    w: float = 0
    h: float = 0
    rotation: float = 0
    z: int = 0
    visible: bool = True


class FieldElement(_ElementBase):
    type: Literal["field"]
    binding: str
    font: str = "sans"
    size_pt: float = 8
    weight: int = 400
    align: str = "left"
    color: str = "#000000"
    uppercase: bool | None = None
    letter_spacing: float | None = None


class TextElement(_ElementBase):
    type: Literal["text"]
    text: str = ""
    font: str = "sans"
    size_pt: float = 8
    weight: int = 400
    align: str = "left"
    color: str = "#000000"
    uppercase: bool | None = None
    letter_spacing: float | None = None


class QrElement(_ElementBase):
    type: Literal["qr"]
    binding: str = "scan_url"
    fg: str = "#000000"
    bg: str = "#ffffff"
    quiet: float = 1


class LogoElement(_ElementBase):
    type: Literal["logo"]
    source: str = "company"
    fit: str = "contain"


class LineElement(_ElementBase):
    type: Literal["line"]
    stroke: str = "#000000"
    stroke_w: float = 0.3


class BoxElement(_ElementBase):
    type: Literal["box"]
    fill: str = "none"
    stroke: str = "none"
    stroke_w: float = 0
    radius: float = 0


LabelElement = Annotated[
    FieldElement | TextElement | QrElement | LogoElement | LineElement | BoxElement,
    Field(discriminator="type"),
]


class SizeMm(BaseModel):
    model_config = ConfigDict(extra="allow")
    w: float
    h: float


class Background(BaseModel):
    model_config = ConfigDict(extra="allow")
    kind: Literal["engraved", "plain"] = "plain"
    fill: str = "#ffffff"
    radius_mm: float = 1


class LabelLayout(BaseModel):
    model_config = ConfigDict(extra="allow")
    version: Literal[2]
    orientation: Literal["landscape", "portrait"] = "landscape"
    size_mm: SizeMm
    background: Background = Field(default_factory=Background)
    grid_mm: float = 1
    elements: list[LabelElement] = Field(default_factory=list)


def _validate_layout(v: dict[str, Any] | None) -> dict[str, Any]:
    if v is None or v == {}:
        return v or {}
    if not is_v2_layout(v):
        raise ValueError("layout_json must be a valid v2 layout (version==2, size_mm, elements[])")
    # full structural validation via pydantic
    LabelLayout.model_validate(v)
    return v


class LabelTemplateOut(ORMModel):
    id: uuid.UUID
    name: str
    concept: str
    size_mm: str
    orientation: str
    layout_json: dict[str, Any]
    is_default: bool


class LabelTemplateCreateIn(ORMModel):
    name: str
    concept: str = "engraved"
    size_mm: str = "90x50"
    orientation: str = "landscape"
    layout_json: dict[str, Any] = Field(default_factory=dict)
    is_default: bool = False

    @field_validator("layout_json")
    @classmethod
    def _check_layout(cls, v: dict[str, Any]) -> dict[str, Any]:
        return _validate_layout(v)


class LabelTemplateUpdateIn(ORMModel):
    name: str | None = None
    concept: str | None = None
    size_mm: str | None = None
    orientation: str | None = None
    layout_json: dict[str, Any] | None = None
    is_default: bool | None = None

    @field_validator("layout_json")
    @classmethod
    def _check_layout(cls, v: dict[str, Any] | None) -> dict[str, Any] | None:
        if v is None:
            return None
        return _validate_layout(v)
