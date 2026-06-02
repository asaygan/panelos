"""Cabinet lifecycle (physical compartments inside a Panel)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import NotFound
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.cabinet import Cabinet
from panelos_api.db.models.panel import Panel

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


async def _get(session: AsyncSession, *, company_id: uuid.UUID, cabinet_id: uuid.UUID) -> Cabinet:
    row = (
        await session.execute(
            select(Cabinet).where(Cabinet.id == cabinet_id, Cabinet.company_id == company_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("cabinet not found")
    return row


async def list_for_panel(
    session: AsyncSession, *, company_id: uuid.UUID, panel_id: uuid.UUID
) -> list[Cabinet]:
    rows = (
        await session.execute(
            select(Cabinet)
            .where(Cabinet.company_id == company_id, Cabinet.panel_id == panel_id)
            .order_by(Cabinet.position, Cabinet.created_at)
        )
    ).scalars().all()
    return list(rows)


async def create_cabinet(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_id: uuid.UUID,
    name: str,
    code: str | None = None,
    notes: str | None = None,
    position: int | None = None,
) -> Cabinet:
    panel = (
        await session.execute(
            select(Panel).where(Panel.id == panel_id, Panel.company_id == company_id)
        )
    ).scalar_one_or_none()
    if panel is None:
        raise NotFound("panel not found")

    if position is None:
        max_pos = (
            await session.execute(
                select(func.max(Cabinet.position)).where(Cabinet.panel_id == panel_id)
            )
        ).scalar_one_or_none()
        position = 0 if max_pos is None else max_pos + 1

    cabinet = Cabinet(
        company_id=company_id,
        panel_id=panel_id,
        name=name,
        code=code,
        position=position,
        notes=notes,
    )
    session.add(cabinet)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.CABINET_CREATED,
        target_type="cabinet",
        target_id=str(cabinet.id),
        meta={"panel_id": str(panel_id), "name": name},
    )
    return cabinet


async def update_cabinet(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    cabinet_id: uuid.UUID,
    changes: dict[str, Any],
) -> Cabinet:
    cabinet = await _get(session, company_id=company_id, cabinet_id=cabinet_id)
    forbidden = {"id", "company_id", "panel_id", "created_at"}
    applied: dict[str, Any] = {}
    for k, v in changes.items():
        if k in forbidden or not hasattr(cabinet, k):
            continue
        setattr(cabinet, k, v)
        applied[k] = v
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.CABINET_UPDATED,
        target_type="cabinet",
        target_id=str(cabinet.id),
        meta={"changes": applied},
    )
    return cabinet


async def move_cabinet(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    cabinet_id: uuid.UUID,
    target_panel_id: uuid.UUID,
) -> Cabinet:
    cabinet = await _get(session, company_id=company_id, cabinet_id=cabinet_id)
    target = (
        await session.execute(
            select(Panel).where(Panel.id == target_panel_id, Panel.company_id == company_id)
        )
    ).scalar_one_or_none()
    if target is None:
        raise NotFound("target panel not found")
    from_panel_id = cabinet.panel_id
    if target_panel_id != from_panel_id:
        max_pos = (
            await session.execute(
                select(func.max(Cabinet.position)).where(Cabinet.panel_id == target_panel_id)
            )
        ).scalar_one_or_none()
        cabinet.panel_id = target_panel_id
        cabinet.position = 0 if max_pos is None else max_pos + 1
        await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.CABINET_UPDATED,
        target_type="cabinet",
        target_id=str(cabinet.id),
        meta={"moved_from": str(from_panel_id), "moved_to": str(target_panel_id)},
    )
    return cabinet


async def delete_cabinet(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    cabinet_id: uuid.UUID,
) -> None:
    cabinet = await _get(session, company_id=company_id, cabinet_id=cabinet_id)
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.CABINET_DELETED,
        target_type="cabinet",
        target_id=str(cabinet.id),
        meta={"panel_id": str(cabinet.panel_id)},
    )
    await session.delete(cabinet)
    await session.flush()
