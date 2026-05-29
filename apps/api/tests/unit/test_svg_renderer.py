"""SVG renderer renders every default template and binds field values."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

from panelos_api.labels.base import LabelSpec
from panelos_api.labels.svg_renderer import render_svg

# import the seed module to reuse the 10 template definitions
_SCRIPTS = Path(__file__).resolve().parents[2] / "scripts"
sys.path.insert(0, str(_SCRIPTS))
import seed  # type: ignore  # noqa: E402


def _spec(size: tuple[float, float]) -> LabelSpec:
    return LabelSpec(
        panel_tag="MCC-3",
        panel_name="MCC Line 3",
        qr_token="abcdefghijklmnopqrstuv",
        qr_url="https://panelos.app/q/abcdefghijklmnopqrstuv",
        revision_letter="E",
        company_short="NORTHFORGE",
        standards="IEC 61439",
        size_mm=size,
        serial="MCC-L3-0088",
        voltage="480V",
        current="800A",
        phase="3O 3W",
        location="Plant 1",
        area="Process Hall",
        company_name="NorthForge Automation",
    )


@pytest.mark.parametrize("tpl", seed.label_templates(), ids=lambda t: t["name"])
def test_render_each_default_layout(tpl: dict) -> None:
    layout = tpl["layout"]
    w = layout["size_mm"]["w"]
    h = layout["size_mm"]["h"]
    svg = render_svg(_spec((w, h)), layout)
    assert isinstance(svg, str)
    assert "<svg" in svg
    # every template binds the panel tag somewhere
    assert "MCC-3" in svg
    assert f"0 0 {w * 10:g} {h * 10:g}" in svg


def test_engraved_has_screw_holes_and_gradient() -> None:
    layout = seed.label_templates()[0]["layout"]
    svg = render_svg(_spec((90, 50)), layout)
    assert "engbg" in svg  # engraved gradient
    assert "<circle" in svg  # screw holes


def test_invisible_element_skipped() -> None:
    spec = _spec((90, 50))
    layout = {
        "version": 2,
        "orientation": "landscape",
        "size_mm": {"w": 90, "h": 50},
        "background": {"kind": "plain", "fill": "#ffffff", "radius_mm": 1},
        "elements": [
            {"id": "hidden", "type": "text", "text": "SECRET", "x": 1, "y": 1,
             "w": 10, "h": 5, "z": 1, "visible": False},
        ],
    }
    svg = render_svg(spec, layout)
    assert "SECRET" not in svg
