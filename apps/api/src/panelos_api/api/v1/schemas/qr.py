"""QR schemas."""

from __future__ import annotations

from typing import Any

from panelos_api.api.v1.schemas.common import ORMModel


class QrResolveOut(ORMModel):
    panel_id: str
    tag: str
    name: str
    serial: str
    company_id: str
    active_revision: dict[str, Any] | None = None
