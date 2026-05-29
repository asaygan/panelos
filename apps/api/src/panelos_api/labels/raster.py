"""Rasterize a label SVG to PNG / PDF via cairosvg.

cairosvg needs system libcairo. On dev machines where it is missing the import
fails; we degrade gracefully so the service can still store the SVG.
"""

from __future__ import annotations

import struct
import zlib

try:  # pragma: no cover - import availability depends on the host
    import cairosvg  # type: ignore

    CAIROSVG_AVAILABLE = True
except Exception:  # pragma: no cover
    cairosvg = None  # type: ignore
    CAIROSVG_AVAILABLE = False


class RasterUnavailable(RuntimeError):
    """Raised when no rasterizer backend is available."""


def _tiny_png() -> bytes:
    """A valid 1x1 transparent PNG (fallback when cairosvg is absent)."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)
    raw = b"\x00\x00\x00\x00\x00"  # one filtered scanline (filter 0 + RGBA px)
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


def svg_to_png(svg: str, width_px: int) -> bytes:
    """Rasterize ``svg`` to PNG bytes at ``width_px`` wide (height auto).

    Falls back to a tiny valid PNG when cairosvg/libcairo is unavailable so the
    caller can still persist the (authoritative) SVG.
    """
    if not CAIROSVG_AVAILABLE or cairosvg is None:
        return _tiny_png()
    return cairosvg.svg2png(  # type: ignore[no-any-return]
        bytestring=svg.encode("utf-8"), output_width=int(width_px)
    )


def svg_to_pdf(svg: str) -> bytes:
    """Rasterize ``svg`` to a single-page PDF."""
    if not CAIROSVG_AVAILABLE or cairosvg is None:
        raise RasterUnavailable("cairosvg/libcairo not available for PDF export")
    return cairosvg.svg2pdf(bytestring=svg.encode("utf-8"))  # type: ignore[no-any-return]


def png_width_for_mm(w_mm: float, dpi: int = 300) -> int:
    """Raster width in px for a label ``w_mm`` wide at ``dpi`` (contract: dpi/254)."""
    return round(w_mm * 10 * dpi / 254)
