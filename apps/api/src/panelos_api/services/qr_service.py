"""QR token lifecycle + render + resolve."""

from __future__ import annotations

import io
from typing import TYPE_CHECKING, Any

import segno
from sqlalchemy import select

from panelos_api.config import get_settings
from panelos_api.core.exceptions import NotFound
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.db.models.scan_event import ScanEvent

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


def public_url_for(token: str) -> str:
    """Construct the public QR URL used inside the code."""

    base = get_settings().APP_URL.rstrip("/")
    return f"{base}/q/{token}"


def render_png(token: str) -> bytes:
    qr = segno.make(public_url_for(token), error="h")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=8, border=2)
    return buf.getvalue()


def render_svg(token: str) -> str:
    qr = segno.make(public_url_for(token), error="h")
    buf = io.BytesIO()
    qr.save(buf, kind="svg", scale=4, border=2, xmldecl=False)
    return buf.getvalue().decode("utf-8")


async def resolve_token(
    session: AsyncSession,
    *,
    token: str,
    user_id: uuid.UUID | None,
    ip: str | None,
    device: str | None,
) -> dict[str, Any]:
    """Look up panel by token, log a scan event, return minimal JSON."""

    panel = (
        await session.execute(select(Panel).where(Panel.qr_token == token))
    ).scalar_one_or_none()
    if panel is None:
        raise NotFound("qr token unknown")

    active_rev: PanelRevision | None = None
    if panel.active_revision_id:
        candidate = await session.get(PanelRevision, panel.active_revision_id)
        # Defense-in-depth: only an APPROVED revision is ever served via QR.
        # Never expose draft/review/rejected/superseded content to the field.
        if candidate is not None and candidate.status == RevisionStatus.APPROVED:
            active_rev = candidate

    scan = ScanEvent(
        panel_id=panel.id,
        user_id=user_id,
        revision_id_served=active_rev.id if active_rev else None,
        ip=ip,
        device=device,
    )
    session.add(scan)
    await session.flush()

    return {
        "panel_id": str(panel.id),
        "tag": panel.tag,
        "name": panel.name,
        "serial": panel.serial,
        "company_id": str(panel.company_id),
        "active_revision": {
            "id": str(active_rev.id),
            "letter": active_rev.revision_letter,
            "number": active_rev.revision_number,
        }
        if active_rev
        else None,
        "message": None if active_rev else "no approved revision yet",
    }
