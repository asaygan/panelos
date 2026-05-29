"""Batch label imposition → PDF (SVG-first via cairosvg).

Kept as a thin seam; the actual multi-up imposition lives in
``services.label_service._impose_svg`` (it needs per-panel SpecS). This module
exposes a helper to convert an already-composed imposition SVG to PDF bytes.
"""

from __future__ import annotations

from panelos_api.labels.raster import svg_to_pdf


def sheet_svg_to_pdf(sheet_svg: str) -> bytes:
    """Convert a composed imposition SVG to PDF bytes (raises if no cairo)."""
    return svg_to_pdf(sheet_svg)
