"""Panel Set CRUD + the Panel Set → Panel → Section tree."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select

from panelos_api.api.v1.schemas.common import Page
from panelos_api.api.v1.schemas.panel import PanelOut
from panelos_api.api.v1.schemas.panel_set import (
    PanelNode,
    PanelSetCreateIn,
    PanelSetNode,
    PanelSetOut,
    PanelSetUpdateIn,
    TreeOut,
)
from panelos_api.api.v1.schemas.section import SectionOut
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_set import PanelSet
from panelos_api.db.models.section import Section
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.services import panel_set_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/panel-sets", tags=["panel-sets"])


@router.get("", response_model=Page[PanelSetOut])
async def list_panel_sets(
    cursor: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=100, le=200),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> Page[PanelSetOut]:
    stmt = (
        select(PanelSet)
        .where(PanelSet.company_id == m.company_id, PanelSet.archived_at.is_(None))
        .order_by(PanelSet.id)
        .limit(limit)
    )
    if cursor is not None:
        stmt = stmt.where(PanelSet.id > cursor)
    rows = (await db.execute(stmt)).scalars().all()
    next_cursor = str(rows[-1].id) if len(rows) == limit else None
    return Page[PanelSetOut](
        items=[PanelSetOut.model_validate(r) for r in rows], next_cursor=next_cursor
    )


@router.get("/tree", response_model=TreeOut)
async def panel_set_tree(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> TreeOut:
    """Assemble the full Panel Set → Panel → Section tree in 3 scoped queries."""
    sets = (
        await db.execute(
            select(PanelSet)
            .where(PanelSet.company_id == m.company_id, PanelSet.archived_at.is_(None))
            .order_by(PanelSet.name)
        )
    ).scalars().all()
    panels = (
        await db.execute(
            select(Panel)
            .where(Panel.company_id == m.company_id, Panel.archived_at.is_(None))
            .order_by(Panel.tag)
        )
    ).scalars().all()
    sections = (
        await db.execute(
            select(Section)
            .where(Section.company_id == m.company_id)
            .order_by(Section.panel_id, Section.position)
        )
    ).scalars().all()

    sections_by_panel: dict[uuid.UUID, list[SectionOut]] = {}
    for s in sections:
        sections_by_panel.setdefault(s.panel_id, []).append(SectionOut.model_validate(s))

    def to_node(p: Panel) -> PanelNode:
        node = PanelNode.model_validate(p)
        node.sections = sections_by_panel.get(p.id, [])
        return node

    panels_by_set: dict[uuid.UUID, list[PanelNode]] = {}
    unassigned: list[PanelNode] = []
    for p in panels:
        node = to_node(p)
        if p.panel_set_id is None:
            unassigned.append(node)
        else:
            panels_by_set.setdefault(p.panel_set_id, []).append(node)

    set_nodes: list[PanelSetNode] = []
    for ps in sets:
        node = PanelSetNode.model_validate(ps)
        node.panels = panels_by_set.get(ps.id, [])
        set_nodes.append(node)

    return TreeOut(panel_sets=set_nodes, unassigned_panels=unassigned)


@router.post("", response_model=PanelSetOut, status_code=status.HTTP_201_CREATED)
async def create_panel_set(
    payload: PanelSetCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> PanelSetOut:
    ps = await panel_set_service.create_panel_set(
        db, company_id=m.company_id, actor_id=m.user.id, **payload.model_dump()
    )
    return PanelSetOut.model_validate(ps)


@router.get("/{panel_set_id}", response_model=PanelSetOut)
async def get_panel_set(
    panel_set_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> PanelSetOut:
    ps = (
        await db.execute(
            select(PanelSet).where(
                PanelSet.id == panel_set_id, PanelSet.company_id == m.company_id
            )
        )
    ).scalar_one_or_none()
    if ps is None:
        raise NotFound("panel set not found")
    return PanelSetOut.model_validate(ps)


@router.get("/{panel_set_id}/panels", response_model=list[PanelOut])
async def panel_set_panels(
    panel_set_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[PanelOut]:
    rows = (
        await db.execute(
            select(Panel)
            .where(
                Panel.company_id == m.company_id,
                Panel.panel_set_id == panel_set_id,
                Panel.archived_at.is_(None),
            )
            .order_by(Panel.tag)
        )
    ).scalars().all()
    return [PanelOut.model_validate(p) for p in rows]


@router.put("/{panel_set_id}", response_model=PanelSetOut)
async def update_panel_set(
    panel_set_id: uuid.UUID,
    payload: PanelSetUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> PanelSetOut:
    ps = await panel_set_service.update_panel_set(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        panel_set_id=panel_set_id,
        changes=payload.model_dump(exclude_unset=True),
    )
    return PanelSetOut.model_validate(ps)


@router.delete("/{panel_set_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_panel_set(
    panel_set_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await panel_set_service.archive_panel_set(
        db, company_id=m.company_id, actor_id=m.user.id, panel_set_id=panel_set_id
    )
