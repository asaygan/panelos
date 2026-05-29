"""Rasterizer test — skips when cairosvg/libcairo is unavailable."""

from __future__ import annotations

import pytest

from panelos_api.labels.raster import CAIROSVG_AVAILABLE, png_width_for_mm, svg_to_png

_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500" '
    'width="900" height="500"><rect x="0" y="0" width="900" height="500" '
    'fill="#ffffff"/><text x="10" y="50" font-size="40">MCC-3</text></svg>'
)


def test_png_width_for_mm() -> None:
    # contract: w_mm * 10 * 300/254
    assert png_width_for_mm(90) == round(90 * 10 * 300 / 254)


@pytest.mark.skipif(not CAIROSVG_AVAILABLE, reason="cairosvg/libcairo not available")
def test_svg_to_png_returns_png_bytes() -> None:
    png = svg_to_png(_SVG, png_width_for_mm(90))
    assert png.startswith(b"\x89PNG")


def test_svg_to_png_fallback_is_valid_png_when_no_cairo() -> None:
    # Even without cairo, svg_to_png returns a valid PNG (tiny fallback).
    png = svg_to_png(_SVG, 100)
    assert png.startswith(b"\x89PNG")
