"""Layout Schema v2 — geometry constants, parsing, defaults, binding resolver.

This is the backend half of the rendering contract documented in
``docs/design/label-layout-schema.md``. Geometry is authored in millimetres;
the SVG renderer maps mm to user units via ``UNITS_PER_MM``.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from panelos_api.labels.base import LabelSpec

# --- constants (mirror the contract; web uses the same numbers) ---
UNITS_PER_MM = 10
PT_TO_U = 254 / 72  # 1pt = 1/72in, 1in = 25.4mm = 254 units


def u(mm: float) -> float:
    """Millimetres -> SVG user units."""
    return float(mm) * UNITS_PER_MM


def parse_size(size_mm: str | None, fallback: tuple[float, float] = (90.0, 50.0)) -> tuple[float, float]:
    """Parse a ``"WxH"`` size string (mm) into a float tuple."""
    if not size_mm:
        return fallback
    try:
        w_s, h_s = size_mm.lower().replace(" ", "").split("x", 1)
        return float(w_s), float(h_s)
    except (ValueError, AttributeError):
        return fallback


# --- binding resolver -------------------------------------------------------

_BINDINGS = {
    "tag",
    "name",
    "serial",
    "rev",
    "voltage",
    "current",
    "phase",
    "mfr",
    "customer",
    "enclosure",
    "location",
    "area",
    "company",
    "company_short",
    "standards",
    "scan_url",
}


def bind_value(binding: str, spec: LabelSpec) -> str:
    """Resolve a binding name to its string value for ``spec``.

    Mirrors the contract's binding table. Missing values render as empty string.
    """
    mapping: dict[str, str] = {
        "tag": spec.panel_tag,
        "name": spec.panel_name,
        "serial": spec.serial,
        "rev": spec.revision_letter,
        "voltage": spec.voltage,
        "current": spec.current,
        "phase": spec.phase,
        "mfr": spec.mfr,
        "customer": spec.customer,
        "enclosure": spec.enclosure,
        "location": spec.location,
        "area": spec.area,
        "company": spec.company_name,
        "company_short": spec.company_short,
        "standards": spec.standards,
        "scan_url": spec.qr_url,
    }
    val = mapping.get(binding, "")
    return "" if val is None else str(val)


# --- validation -------------------------------------------------------------

_VALID_TYPES = {"field", "text", "qr", "logo", "line", "box"}


def is_v2_layout(layout: Any) -> bool:
    """True if ``layout`` looks like a valid v2 layout document."""
    if not isinstance(layout, dict):
        return False
    if layout.get("version") != 2:
        return False
    size = layout.get("size_mm")
    if not isinstance(size, dict) or "w" not in size or "h" not in size:
        return False
    els = layout.get("elements")
    if not isinstance(els, list):
        return False
    return all(
        isinstance(el, dict) and el.get("type") in _VALID_TYPES for el in els
    )


# --- default layouts (examples #1 and #2 from the contract) -----------------

def default_engraved_layout(w: float = 90.0, h: float = 50.0) -> dict[str, Any]:
    """Example #1 — Industrial Engraved (landscape 90x50)."""
    return {
        "version": 2,
        "orientation": "landscape" if w >= h else "portrait",
        "size_mm": {"w": w, "h": h},
        "background": {"kind": "engraved", "fill": "#1f242b", "radius_mm": 1.8},
        "grid_mm": 1,
        "elements": [
            {"id": "border", "type": "box", "x": 2, "y": 2, "w": 86, "h": 46, "rotation": 0, "z": 0, "visible": True, "fill": "none", "stroke": "#ffffff24", "stroke_w": 0.25, "radius": 1},
            {"id": "logo", "type": "logo", "x": 5, "y": 4.5, "w": 6, "h": 6, "rotation": 0, "z": 1, "visible": True, "source": "company", "fit": "contain"},
            {"id": "brand", "type": "field", "binding": "company_short", "x": 12.5, "y": 5, "w": 40, "h": 5, "rotation": 0, "z": 2, "visible": True, "font": "sans", "size_pt": 7, "weight": 700, "align": "left", "color": "#cdd6df", "letter_spacing": 0.12},
            {"id": "tag", "type": "field", "binding": "tag", "x": 5, "y": 25, "w": 50, "h": 11, "rotation": 0, "z": 3, "visible": True, "font": "mono", "size_pt": 22, "weight": 700, "align": "left", "color": "#ffffff"},
            {"id": "name", "type": "field", "binding": "name", "x": 5, "y": 36, "w": 50, "h": 5, "rotation": 0, "z": 4, "visible": True, "font": "sans", "size_pt": 8, "weight": 400, "align": "left", "color": "#9aa6b2", "uppercase": True},
            {"id": "div", "type": "line", "x": 5, "y": 22, "w": 50, "h": 0, "rotation": 0, "z": 2, "visible": True, "stroke": "#ffffff1f", "stroke_w": 0.3},
            {"id": "serial", "type": "field", "binding": "serial", "x": 5, "y": 43, "w": 30, "h": 4, "rotation": 0, "z": 5, "visible": True, "font": "mono", "size_pt": 7.5, "weight": 400, "align": "left", "color": "#dde4ec"},
            {"id": "rev", "type": "field", "binding": "rev", "x": 38, "y": 43, "w": 14, "h": 4, "rotation": 0, "z": 5, "visible": True, "font": "mono", "size_pt": 7.5, "weight": 400, "align": "left", "color": "#dde4ec"},
            {"id": "qr", "type": "qr", "binding": "scan_url", "x": 62, "y": 11, "w": 24, "h": 24, "rotation": 0, "z": 6, "visible": True, "fg": "#000000", "bg": "#ffffff", "quiet": 1},
            {"id": "scancap", "type": "text", "text": "SCAN FOR DOCS", "x": 60, "y": 37, "w": 28, "h": 3, "rotation": 0, "z": 6, "visible": True, "font": "sans", "size_pt": 5.5, "weight": 600, "align": "center", "color": "#7d8a97", "letter_spacing": 0.1},
        ],
    }


def default_print_layout(w: float = 90.0, h: float = 50.0) -> dict[str, Any]:
    """Example #2 — Printable B/W (landscape 90x50)."""
    return {
        "version": 2,
        "orientation": "landscape" if w >= h else "portrait",
        "size_mm": {"w": w, "h": h},
        "background": {"kind": "plain", "fill": "#ffffff", "radius_mm": 1},
        "grid_mm": 1,
        "elements": [
            {"id": "hdr", "type": "box", "x": 0, "y": 0, "w": 90, "h": 8, "rotation": 0, "z": 0, "visible": True, "fill": "#000000", "stroke": "none", "stroke_w": 0, "radius": 0},
            {"id": "brand", "type": "field", "binding": "company", "x": 3, "y": 0.5, "w": 55, "h": 6, "rotation": 0, "z": 1, "visible": True, "font": "sans", "size_pt": 7, "weight": 800, "align": "left", "color": "#ffffff", "letter_spacing": 0.12, "uppercase": True},
            {"id": "asset", "type": "text", "text": "PANELOS ASSET", "x": 55, "y": 0.5, "w": 32, "h": 6, "rotation": 0, "z": 1, "visible": True, "font": "sans", "size_pt": 6, "weight": 600, "align": "right", "color": "#ffffff"},
            {"id": "qr", "type": "qr", "binding": "scan_url", "x": 4, "y": 12, "w": 26, "h": 26, "rotation": 0, "z": 2, "visible": True, "fg": "#000000", "bg": "#ffffff", "quiet": 1},
            {"id": "qrborder", "type": "box", "x": 4, "y": 12, "w": 26, "h": 26, "rotation": 0, "z": 1, "visible": True, "fill": "none", "stroke": "#000000", "stroke_w": 0.5, "radius": 0},
            {"id": "tag", "type": "field", "binding": "tag", "x": 34, "y": 11, "w": 52, "h": 12, "rotation": 0, "z": 2, "visible": True, "font": "mono", "size_pt": 24, "weight": 800, "align": "left", "color": "#000000"},
            {"id": "name", "type": "field", "binding": "name", "x": 34, "y": 23, "w": 52, "h": 5, "rotation": 0, "z": 2, "visible": True, "font": "sans", "size_pt": 8, "weight": 600, "align": "left", "color": "#000000"},
            {"id": "sn", "type": "field", "binding": "serial", "x": 34, "y": 31, "w": 30, "h": 4, "rotation": 0, "z": 2, "visible": True, "font": "mono", "size_pt": 7, "weight": 700, "align": "left", "color": "#000000"},
            {"id": "rev", "type": "field", "binding": "rev", "x": 66, "y": 31, "w": 20, "h": 4, "rotation": 0, "z": 2, "visible": True, "font": "mono", "size_pt": 7, "weight": 700, "align": "left", "color": "#000000"},
            {"id": "foot", "type": "line", "x": 4, "y": 42, "w": 82, "h": 0, "rotation": 0, "z": 1, "visible": True, "stroke": "#000000", "stroke_w": 0.3},
            {"id": "std", "type": "field", "binding": "standards", "x": 4, "y": 43, "w": 30, "h": 4, "rotation": 0, "z": 2, "visible": True, "font": "mono", "size_pt": 6, "weight": 400, "align": "left", "color": "#000000"},
            {"id": "url", "type": "field", "binding": "scan_url", "x": 40, "y": 43, "w": 46, "h": 4, "rotation": 0, "z": 2, "visible": True, "font": "mono", "size_pt": 6, "weight": 400, "align": "right", "color": "#000000"},
        ],
    }


def default_layout_for(concept: str, w: float, h: float) -> dict[str, Any]:
    """Return the appropriate default layout for a concept + size."""
    if concept in ("print_bw", "print", "plain"):
        return default_print_layout(w, h)
    return default_engraved_layout(w, h)
