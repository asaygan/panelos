"""Panel lifecycle."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import NotFound
from panelos_api.core.ids import new_qr_token
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.panel import Panel, PanelStatus
from panelos_api.repositories.panel_repo import PanelRepo

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


async def create_panel(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    tag: str,
    serial: str,
    name: str,
    location_id: uuid.UUID | None = None,
    **metadata: Any,
) -> Panel:
    panel = Panel(
        company_id=company_id,
        tag=tag,
        serial=serial,
        name=name,
        location_id=location_id,
        qr_token=new_qr_token(),
        status=PanelStatus.OK,
        **{k: v for k, v in metadata.items() if hasattr(Panel, k)},
    )
    session.add(panel)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_CREATED,
        target_type="panel",
        target_id=str(panel.id),
        meta={"tag": tag, "serial": serial},
    )
    return panel


async def update_metadata(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_id: uuid.UUID,
    changes: dict[str, Any],
) -> Panel:
    repo = PanelRepo(session, company_id)
    panel = await repo.get(panel_id)
    if panel is None:
        raise NotFound("panel not found")
    forbidden = {"id", "company_id", "qr_token", "created_at"}
    applied: dict[str, Any] = {}
    for k, v in changes.items():
        if k in forbidden or not hasattr(panel, k):
            continue
        setattr(panel, k, v)
        applied[k] = v
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_UPDATED,
        target_type="panel",
        target_id=str(panel.id),
        meta={"changes": applied},
    )
    return panel


async def archive_panel(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_id: uuid.UUID,
) -> Panel:
    repo = PanelRepo(session, company_id)
    panel = await repo.get(panel_id)
    if panel is None:
        raise NotFound("panel not found")
    panel.archived_at = datetime.now(UTC)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_ARCHIVED,
        target_type="panel",
        target_id=str(panel.id),
        meta={},
    )
    return panel
