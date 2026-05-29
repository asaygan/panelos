"""Zebra ZPL adapter — future work."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from panelos_api.labels.base import LabelSpec


class ZplRenderer:
    """Reserved seam for Zebra ZPL II output."""

    def render_png(self, spec: LabelSpec) -> bytes:
        raise NotImplementedError("ZPL adapter — future")

    def render_svg(self, spec: LabelSpec) -> str:
        raise NotImplementedError("ZPL adapter — future")

    def render_zpl(self, spec: LabelSpec) -> str:
        raise NotImplementedError("ZPL adapter — future")
