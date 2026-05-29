"""Brother label printer adapter — future work."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from panelos_api.labels.base import LabelSpec


class BrotherRenderer:
    """Reserved seam for Brother P-touch raster output."""

    def render_png(self, spec: LabelSpec) -> bytes:
        raise NotImplementedError("Brother adapter — future")

    def render_svg(self, spec: LabelSpec) -> str:
        raise NotImplementedError("Brother adapter — future")
