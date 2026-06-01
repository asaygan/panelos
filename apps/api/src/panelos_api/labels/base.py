"""Label spec + renderer protocol."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass(slots=True)
class LabelSpec:
    """Inputs to render a single label.

    All binding values used by the v2 layout schema live here; the
    ``bind_value`` resolver in ``labels.layout`` maps a binding name to one of
    these attributes.
    """

    panel_tag: str
    panel_name: str
    qr_token: str
    qr_url: str
    revision_letter: str
    company_short: str
    standards: str = ""
    size_mm: tuple[float, float] = (90.0, 50.0)
    template: str = "engraved"
    # Extended binding fields (v2 schema)
    serial: str = ""
    voltage: str = ""
    current: str = ""
    phase: str = ""
    mfr: str = ""
    customer: str = ""
    enclosure: str = ""
    location: str = ""
    area: str = ""
    company_name: str = ""
    logo_bytes: bytes | None = None
    fields: dict[str, Any] = field(default_factory=dict)


@runtime_checkable
class LabelRenderer(Protocol):
    """Produces PNG/SVG output for a ``LabelSpec``."""

    def render_png(self, spec: LabelSpec) -> bytes: ...
    def render_svg(self, spec: LabelSpec) -> str: ...
