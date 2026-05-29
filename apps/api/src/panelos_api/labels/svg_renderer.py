"""SVG-first label renderer implementing Layout Schema v2.

``render_svg(spec, layout)`` produces an ``<svg>`` whose geometry matches the
rendering contract in ``docs/design/label-layout-schema.md`` exactly, so that
the web preview, exported PNG/SVG and PDF are pixel-identical.
"""

from __future__ import annotations

import base64
from typing import TYPE_CHECKING, Any
from xml.sax.saxutils import escape

import segno

from panelos_api.labels.fonts import font_face_css
from panelos_api.labels.layout import (
    PT_TO_U,
    bind_value,
    default_layout_for,
    is_v2_layout,
    u,
)

if TYPE_CHECKING:
    from panelos_api.labels.base import LabelSpec

_FONT_FAMILY = {"sans": "Inter", "mono": "JetBrains Mono"}


def _attr(value: Any) -> str:
    return escape(str(value), {'"': "&quot;"})


def _num(value: float) -> str:
    """Render a float without trailing zeros."""
    return f"{value:.4f}".rstrip("0").rstrip(".")


def _rotation_transform(el: dict[str, Any]) -> str:
    rot = float(el.get("rotation", 0) or 0)
    if rot == 0:
        return ""
    cx = u(float(el.get("x", 0)) + float(el.get("w", 0)) / 2)
    cy = u(float(el.get("y", 0)) + float(el.get("h", 0)) / 2)
    return f' transform="rotate({_num(rot)} {_num(cx)} {_num(cy)})"'


def _text_element(el: dict[str, Any], content: str) -> str:
    x = float(el.get("x", 0))
    y = float(el.get("y", 0))
    w = float(el.get("w", 0))
    h = float(el.get("h", 0))
    align = el.get("align", "left")
    if align == "center":
        tx, anchor = u(x + w / 2), "middle"
    elif align == "right":
        tx, anchor = u(x + w), "end"
    else:
        tx, anchor = u(x), "start"
    ty = u(y + h / 2)
    size = float(el.get("size_pt", 8)) * PT_TO_U
    family = _FONT_FAMILY.get(el.get("font", "sans"), "Inter")
    weight = int(el.get("weight", 400) or 400)
    color = el.get("color", "#000000")
    if el.get("uppercase"):
        content = content.upper()
    extra = ""
    ls = el.get("letter_spacing")
    if ls:
        extra += f' letter-spacing="{_num(u(float(ls)))}"'
    return (
        f'<text x="{_num(tx)}" y="{_num(ty)}" text-anchor="{anchor}" '
        f'dominant-baseline="central" font-family="{family}" '
        f'font-size="{_num(size)}" font-weight="{weight}" fill="{_attr(color)}"'
        f"{extra}{_rotation_transform(el)}>{escape(content)}</text>"
    )


def _qr_element(el: dict[str, Any], spec: LabelSpec) -> str:
    x = float(el.get("x", 0))
    y = float(el.get("y", 0))
    w = float(el.get("w", 0))
    h = float(el.get("h", 0))
    fg = el.get("fg", "#000000")
    bg = el.get("bg", "#ffffff")
    quiet = float(el.get("quiet", 1))
    url = bind_value(el.get("binding", "scan_url"), spec)

    parts = [
        f'<rect x="{_num(u(x))}" y="{_num(u(y))}" width="{_num(u(w))}" '
        f'height="{_num(u(h))}" fill="{_attr(bg)}" />'
    ]
    matrix = list(segno.make(url, error="m").matrix)
    n = len(matrix)
    if n:
        side_mm = min(w, h) - 2 * quiet
        if side_mm <= 0:
            side_mm = min(w, h)
        module_mm = side_mm / n
        # center the module grid in the box
        ox = x + (w - module_mm * n) / 2
        oy = y + (h - module_mm * n) / 2
        cells: list[str] = []
        for r, row in enumerate(matrix):
            for c, val in enumerate(row):
                if val:
                    cells.append(
                        f'<rect x="{_num(u(ox + c * module_mm))}" '
                        f'y="{_num(u(oy + r * module_mm))}" '
                        f'width="{_num(u(module_mm))}" height="{_num(u(module_mm))}" />'
                    )
        parts.append(
            f'<g fill="{_attr(fg)}" shape-rendering="crispEdges">'
            + "".join(cells)
            + "</g>"
        )
    g = "".join(parts)
    return f"<g{_rotation_transform(el)}>{g}</g>"


def _logo_element(el: dict[str, Any], spec: LabelSpec) -> str:
    x = float(el.get("x", 0))
    y = float(el.get("y", 0))
    w = float(el.get("w", 0))
    h = float(el.get("h", 0))
    rot = _rotation_transform(el)
    if el.get("source") == "company" and spec.logo_bytes:
        mime = _guess_mime(spec.logo_bytes)
        b64 = base64.b64encode(spec.logo_bytes).decode("ascii")
        return (
            f'<image x="{_num(u(x))}" y="{_num(u(y))}" width="{_num(u(w))}" '
            f'height="{_num(u(h))}" preserveAspectRatio="xMidYMid meet" '
            f'href="data:{mime};base64,{b64}"{rot} />'
        )
    # monogram fallback
    label = "".join(p[0] for p in (spec.company_short or spec.company_name or "?").split()[:2])
    label = (label or "?").upper()
    cx = u(x + w / 2)
    cy = u(y + h / 2)
    fs = min(u(w), u(h)) * 0.55
    return (
        f"<g{rot}>"
        f'<rect x="{_num(u(x))}" y="{_num(u(y))}" width="{_num(u(w))}" '
        f'height="{_num(u(h))}" rx="{_num(u(min(w, h) * 0.18))}" fill="#14171a" />'
        f'<text x="{_num(cx)}" y="{_num(cy)}" text-anchor="middle" '
        f'dominant-baseline="central" font-family="Inter" font-weight="700" '
        f'font-size="{_num(fs)}" fill="#ffffff">{escape(label)}</text>'
        f"</g>"
    )


def _guess_mime(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:5] == b"<?xml" or data[:4] == b"<svg":
        return "image/svg+xml"
    if data[:4] == b"GIF8":
        return "image/gif"
    return "image/png"


def _line_element(el: dict[str, Any]) -> str:
    x = float(el.get("x", 0))
    y = float(el.get("y", 0))
    w = float(el.get("w", 0))
    h = float(el.get("h", 0))
    return (
        f'<line x1="{_num(u(x))}" y1="{_num(u(y))}" x2="{_num(u(x + w))}" '
        f'y2="{_num(u(y + h))}" stroke="{_attr(el.get("stroke", "#000000"))}" '
        f'stroke-width="{_num(u(float(el.get("stroke_w", 0.3))))}"{_rotation_transform(el)} />'
    )


def _box_element(el: dict[str, Any]) -> str:
    x = float(el.get("x", 0))
    y = float(el.get("y", 0))
    w = float(el.get("w", 0))
    h = float(el.get("h", 0))
    fill = el.get("fill", "none")
    stroke = el.get("stroke", "none")
    stroke_w = float(el.get("stroke_w", 0) or 0)
    radius = float(el.get("radius", 0) or 0)
    rx = f' rx="{_num(u(radius))}"' if radius else ""
    sw = f' stroke-width="{_num(u(stroke_w))}"' if stroke_w else ""
    sk = f' stroke="{_attr(stroke)}"' if stroke and stroke != "none" else ""
    return (
        f'<rect x="{_num(u(x))}" y="{_num(u(y))}" width="{_num(u(w))}" '
        f'height="{_num(u(h))}"{rx} fill="{_attr(fill)}"{sk}{sw}'
        f"{_rotation_transform(el)} />"
    )


def _background(layout: dict[str, Any], w: float, h: float) -> str:
    bg = layout.get("background", {}) or {}
    kind = bg.get("kind", "plain")
    radius = float(bg.get("radius_mm", 1))
    rx = _num(u(radius))
    if kind == "engraved":
        defs = (
            '<linearGradient id="engbg" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0%" stop-color="#2c3137"/>'
            '<stop offset="55%" stop-color="#1b1f24"/>'
            '<stop offset="100%" stop-color="#23282e"/>'
            "</linearGradient>"
            '<radialGradient id="screw" cx="0.5" cy="0.5" r="0.5">'
            '<stop offset="0%" stop-color="#4a525a"/>'
            '<stop offset="100%" stop-color="#0c0e10"/>'
            "</radialGradient>"
        )
        body = [
            f'<rect x="0" y="0" width="{_num(u(w))}" height="{_num(u(h))}" '
            f'rx="{rx}" fill="url(#engbg)" />',
            f'<rect x="{_num(u(2))}" y="{_num(u(2))}" width="{_num(u(w - 4))}" '
            f'height="{_num(u(h - 4))}" rx="{_num(u(1))}" fill="none" '
            f'stroke="#ffffff24" stroke-width="{_num(u(0.25))}" />',
        ]
        for cx, cy in ((3, 3), (w - 3, 3), (3, h - 3), (w - 3, h - 3)):
            body.append(
                f'<circle cx="{_num(u(cx))}" cy="{_num(u(cy))}" '
                f'r="{_num(u(1.2))}" fill="url(#screw)" />'
            )
        return defs, "".join(body)
    # plain
    fill = bg.get("fill", "#ffffff")
    body = (
        f'<rect x="0" y="0" width="{_num(u(w))}" height="{_num(u(h))}" rx="{rx}" '
        f'fill="{_attr(fill)}" stroke="#c9ccd0" stroke-width="{_num(u(0.2))}" />'
    )
    return "", body


def render_svg(spec: LabelSpec, layout: dict[str, Any] | None) -> str:
    """Render a complete SVG string for ``spec`` using v2 ``layout``."""
    if not is_v2_layout(layout):
        w_fb, h_fb = spec.size_mm
        layout = default_layout_for(spec.template, w_fb, h_fb)

    assert layout is not None
    size = layout.get("size_mm", {})
    w = float(size.get("w", spec.size_mm[0]))
    h = float(size.get("h", spec.size_mm[1]))

    bg_defs, bg_body = _background(layout, w, h)

    parts: list[str] = []
    elements = sorted(
        layout.get("elements", []),
        key=lambda e: int(e.get("z", 0) or 0),
    )
    for el in elements:
        if el.get("visible") is False:
            continue
        etype = el.get("type")
        if etype == "field":
            parts.append(_text_element(el, bind_value(el.get("binding", ""), spec)))
        elif etype == "text":
            parts.append(_text_element(el, str(el.get("text", ""))))
        elif etype == "qr":
            parts.append(_qr_element(el, spec))
        elif etype == "logo":
            parts.append(_logo_element(el, spec))
        elif etype == "line":
            parts.append(_line_element(el))
        elif etype == "box":
            parts.append(_box_element(el))

    face = font_face_css()
    style = f"<style>{face}</style>" if face else ""
    defs = f"<defs>{style}{bg_defs}</defs>"

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {_num(u(w))} {_num(u(h))}" '
        f'width="{_num(u(w))}" height="{_num(u(h))}">'
        f"{defs}{bg_body}{''.join(parts)}</svg>"
    )
