"""Dark phenolic engraved-style label.

Now a thin wrapper: provides the default engraved v2 layout and routes all
drawing through the shared SVG renderer + rasterizer (pixel parity with web).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from panelos_api.labels.layout import default_engraved_layout
from panelos_api.labels.raster import png_width_for_mm, svg_to_png
from panelos_api.labels.svg_renderer import render_svg

if TYPE_CHECKING:
    from panelos_api.labels.base import LabelSpec


def default_layout(spec: LabelSpec) -> dict[str, Any]:
    w, h = spec.size_mm
    return default_engraved_layout(w, h)


class EngravedRenderer:
    """Engraved tag rendered from the default engraved v2 layout."""

    def render_svg(self, spec: LabelSpec) -> str:
        return render_svg(spec, default_layout(spec))

    def render_png(self, spec: LabelSpec) -> bytes:
        w = spec.size_mm[0]
        return svg_to_png(self.render_svg(spec), png_width_for_mm(w))
