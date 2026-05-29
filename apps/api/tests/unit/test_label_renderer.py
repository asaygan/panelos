"""Label renderers smoke-test."""

from __future__ import annotations

from panelos_api.labels.base import LabelSpec
from panelos_api.labels.engraved import EngravedRenderer
from panelos_api.labels.print_bw import PrintBwRenderer


def _spec() -> LabelSpec:
    return LabelSpec(
        panel_tag="MCC-3",
        panel_name="MCC Line 3",
        qr_token="abcdefghijklmnopqrstuv",
        qr_url="https://panelos.app/q/abcdefghijklmnopqrstuv",
        revision_letter="E",
        company_short="NORTHFORGE",
        standards="IEC 61439",
    )


def test_engraved_png_renders() -> None:
    png = EngravedRenderer().render_png(_spec())
    assert png.startswith(b"\x89PNG")


def test_engraved_svg_renders() -> None:
    svg = EngravedRenderer().render_svg(_spec())
    assert "<svg" in svg


def test_print_bw_png_renders() -> None:
    png = PrintBwRenderer().render_png(_spec())
    assert png.startswith(b"\x89PNG")


def test_print_bw_svg_renders() -> None:
    svg = PrintBwRenderer().render_svg(_spec())
    assert "<svg" in svg


def test_engraved_png_renders_with_fields_selection() -> None:
    spec = _spec()
    spec.fields = {"name": True, "serial": True, "rev": True, "volt": True, "loc": True}
    png = EngravedRenderer().render_png(spec)
    # PNG magic always holds; full-size raster requires cairosvg.
    assert png.startswith(b"\x89PNG")


def test_label_spec_carries_fields_and_layout() -> None:
    spec = LabelSpec(
        panel_tag="MCC-3",
        panel_name="MCC Line 3",
        qr_token="abcdefghijklmnopqrstuv",
        qr_url="https://panelos.app/q/abcdefghijklmnopqrstuv",
        revision_letter="E",
        company_short="NORTHFORGE",
        fields={"name": True, "layout": {"fields": [{"key": "tag", "x": 24}]}},
    )
    assert spec.fields["name"] is True
    assert spec.fields["layout"]["fields"][0]["key"] == "tag"
