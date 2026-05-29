"""Bundled font assets (Inter + JetBrains Mono) for SVG embedding.

TTFs live in ``assets/`` and are embedded as base64 ``@font-face`` rules in
every rendered SVG (so cairosvg + the browser both resolve the same glyphs).
The Docker image also installs them to ``/usr/share/fonts`` as a fallback.
"""

from __future__ import annotations

import base64
from functools import cache, lru_cache
from pathlib import Path

ASSETS_DIR = Path(__file__).resolve().parent / "assets"

# (family, weight) -> filename. Weight 600 maps to SemiBold for Inter; JetBrains
# Mono ships only Regular/Bold, so 600/700/800 all resolve to Bold.
FONT_FILES: dict[tuple[str, int], str] = {
    ("Inter", 400): "Inter-Regular.ttf",
    ("Inter", 600): "Inter-SemiBold.ttf",
    ("Inter", 700): "Inter-Bold.ttf",
    ("Inter", 800): "Inter-Bold.ttf",
    ("JetBrains Mono", 400): "JetBrainsMono-Regular.ttf",
    ("JetBrains Mono", 600): "JetBrainsMono-Bold.ttf",
    ("JetBrains Mono", 700): "JetBrainsMono-Bold.ttf",
    ("JetBrains Mono", 800): "JetBrainsMono-Bold.ttf",
}


def _path(filename: str) -> Path:
    return ASSETS_DIR / filename


# Backwards-compatible single-path helpers (kept for legacy imports / tests).
def get_inter_regular() -> Path | None:
    p = _path("Inter-Regular.ttf")
    return p if p.exists() else None


def get_inter_bold() -> Path | None:
    p = _path("Inter-Bold.ttf")
    return p if p.exists() else None


def get_mono() -> Path | None:
    p = _path("JetBrainsMono-Regular.ttf")
    return p if p.exists() else None


@cache
def _b64(filename: str) -> str | None:
    p = _path(filename)
    if not p.exists():
        return None
    return base64.b64encode(p.read_bytes()).decode("ascii")


@lru_cache(maxsize=1)
def font_face_css() -> str:
    """Return ``@font-face`` rules embedding every available bundled font.

    If no TTFs are bundled, returns an empty string and the renderer degrades to
    family-name-only (cairosvg / browser system fallback).
    """
    seen: set[str] = set()
    rules: list[str] = []
    for (family, weight), filename in FONT_FILES.items():
        if filename in seen:
            continue
        data = _b64(filename)
        if data is None:
            continue
        seen.add(filename)
        rules.append(
            f"@font-face{{font-family:'{family}';font-style:normal;"
            f"font-weight:{weight};"
            f"src:url(data:font/ttf;base64,{data}) format('truetype');}}"
        )
    return "".join(rules)


def fonts_available() -> bool:
    return any(_path(f).exists() for f in FONT_FILES.values())
