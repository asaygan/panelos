"""Panel Set lifecycle (facility/system grouping above panels)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import NotFound
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.panel_set import PanelSet

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


async def _get(session: AsyncSession, *, company_id: uuid.UUID, panel_set_id: uuid.UUID) -> PanelSet:
    row = (
        await session.execute(
            select(PanelSet).where(
                PanelSet.id == panel_set_id, PanelSet.company_id == company_id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("panel set not found")
    return row


async def create_panel_set(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    name: str,
    code: str | None = None,
    description: str | None = None,
    location_id: uuid.UUID | None = None,
) -> PanelSet:
    panel_set = PanelSet(
        company_id=company_id,
        name=name,
        code=code,
        description=description,
        location_id=location_id,
    )
    session.add(panel_set)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_SET_CREATED,
        target_type="panel_set",
        target_id=str(panel_set.id),
        meta={"name": name},
    )
    return panel_set


async def update_panel_set(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_set_id: uuid.UUID,
    changes: dict[str, Any],
) -> PanelSet:
    panel_set = await _get(session, company_id=company_id, panel_set_id=panel_set_id)
    forbidden = {"id", "company_id", "created_at"}
    applied: dict[str, Any] = {}
    for k, v in changes.items():
        if k in forbidden or not hasattr(panel_set, k):
            continue
        setattr(panel_set, k, v)
        applied[k] = v
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_SET_UPDATED,
        target_type="panel_set",
        target_id=str(panel_set.id),
        meta={"changes": applied},
    )
    return panel_set


async def archive_panel_set(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_set_id: uuid.UUID,
) -> PanelSet:
    panel_set = await _get(session, company_id=company_id, panel_set_id=panel_set_id)
    panel_set.archived_at = datetime.now(UTC)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_SET_ARCHIVED,
        target_type="panel_set",
        target_id=str(panel_set.id),
        meta={},
    )
    return panel_set
