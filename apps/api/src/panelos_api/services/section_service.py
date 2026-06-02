"""Section lifecycle (functional parts inside a panel)."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import NotFound
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.section import Section, SectionType

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


async def list_for_panel(
    session: AsyncSession, *, company_id: uuid.UUID, panel_id: uuid.UUID
) -> list[Section]:
    rows = (
        await session.execute(
            select(Section)
            .where(Section.company_id == company_id, Section.panel_id == panel_id)
            .order_by(Section.position, Section.created_at)
        )
    ).scalars().all()
    return list(rows)


async def _get(session: AsyncSession, *, company_id: uuid.UUID, section_id: uuid.UUID) -> Section:
    row = (
        await session.execute(
            select(Section).where(Section.id == section_id, Section.company_id == company_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("section not found")
    return row


async def create_section(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_id: uuid.UUID,
    section_type: SectionType,
    name: str,
    description: str | None = None,
    position: int | None = None,
) -> Section:
    # Parent panel must belong to the caller's company.
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
                select(func.max(Section.position)).where(Section.panel_id == panel_id)
            )
        ).scalar_one_or_none()
        position = 0 if max_pos is None else max_pos + 1

    section = Section(
        company_id=company_id,
        panel_id=panel_id,
        section_type=section_type,
        name=name,
        description=description,
        position=position,
    )
    session.add(section)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.SECTION_CREATED,
        target_type="section",
        target_id=str(section.id),
        meta={"panel_id": str(panel_id), "name": name, "type": section_type.value},
    )
    return section


async def update_section(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    section_id: uuid.UUID,
    changes: dict[str, Any],
) -> Section:
    section = await _get(session, company_id=company_id, section_id=section_id)
    forbidden = {"id", "company_id", "panel_id", "created_at"}
    applied: dict[str, Any] = {}
    for k, v in changes.items():
        if k in forbidden or not hasattr(section, k):
            continue
        setattr(section, k, v)
        applied[k] = v.value if hasattr(v, "value") else v
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.SECTION_UPDATED,
        target_type="section",
        target_id=str(section.id),
        meta={"changes": applied},
    )
    return section


async def move_section(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    section_id: uuid.UUID,
    target_panel_id: uuid.UUID,
) -> Section:
    """Reparent a section to another panel in the same company (drag-to-move)."""
    section = await _get(session, company_id=company_id, section_id=section_id)
    target = (
        await session.execute(
            select(Panel).where(Panel.id == target_panel_id, Panel.company_id == company_id)
        )
    ).scalar_one_or_none()
    if target is None:
        raise NotFound("target panel not found")

    from_panel_id = section.panel_id
    if target_panel_id != from_panel_id:
        max_pos = (
            await session.execute(
                select(func.max(Section.position)).where(Section.panel_id == target_panel_id)
            )
        ).scalar_one_or_none()
        section.panel_id = target_panel_id
        section.position = 0 if max_pos is None else max_pos + 1
        await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.SECTION_UPDATED,
        target_type="section",
        target_id=str(section.id),
        meta={"moved_from": str(from_panel_id), "moved_to": str(target_panel_id)},
    )
    return section


async def delete_section(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    section_id: uuid.UUID,
) -> None:
    section = await _get(session, company_id=company_id, section_id=section_id)
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.SECTION_DELETED,
        target_type="section",
        target_id=str(section.id),
        meta={"panel_id": str(section.panel_id)},
    )
    await session.delete(section)
    await session.flush()
