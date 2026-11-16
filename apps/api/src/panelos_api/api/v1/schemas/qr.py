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
    # True when the company has disabled public QR access and the scanner is not
    # an authenticated same-company member: identity fields are blanked and no
    # revision is served. The client shows a "sign in to view" state.
    restricted: bool = False
    # True when the scanner is signed in and belongs to the panel's company.
    is_member: bool = False
    company_name: str = ""
    location: str | None = None
