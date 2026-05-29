"""Reusable label layout templates (visual editor backend).

``layout_json`` holds the **Layout Schema v2** (millimetre coordinates,
resolution-independent) that backend + web render identically. See
``docs/design/label-layout-schema.md`` and ``labels/layout.py``::

    {
      "version": 2,
      "orientation": "landscape" | "portrait",
      "size_mm": { "w": 90, "h": 50 },
      "background": { "kind": "engraved" | "plain", "fill": "#hex", "radius_mm": 1.8 },
      "grid_mm": 1,
      "elements": [
        { "id": "tag", "type": "field", "binding": "tag", "x": 5, "y": 25,
          "w": 50, "h": 11, "rotation": 0, "z": 3, "visible": true,
          "font": "mono", "size_pt": 22, "weight": 700, "align": "left",
          "color": "#ffffff" }
        // type ∈ field | text | qr | logo | line | box
      ]
    }

All geometry is authored in mm; the renderer maps mm→SVG units via
``UNITS_PER_MM = 10``. The ``orientation`` column is a convenience mirror of the
layout; ``size_mm`` is authoritative for geometry.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from panelos_api.db.base import Base, TenantMixin, TimestampMixin, UUIDPKMixin


class LabelTemplate(UUIDPKMixin, TimestampMixin, TenantMixin, Base):
    __tablename__ = "label_templates"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    concept: Mapped[str] = mapped_column(String(20), nullable=False, default="engraved")
    size_mm: Mapped[str] = mapped_column(String(20), nullable=False, default="90x50")
    orientation: Mapped[str] = mapped_column(String(16), nullable=False, default="landscape")
    layout_json: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, default=dict)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
