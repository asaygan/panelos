"""Project CRUD + System Group CRUD + assembled asset tree (4 levels)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select

from panelos_api.api.v1.schemas.common import Page
from panelos_api.api.v1.schemas.panel import PanelOut
from panelos_api.api.v1.schemas.project import (
    PanelNode,
    ProjectCreateIn,
    ProjectNode,
    ProjectOut,
    ProjectStatusHistoryOut,
    ProjectUpdateIn,
    SystemGroupCreateIn,
    SystemGroupNode,
    SystemGroupOut,
    SystemGroupStatusHistoryOut,
    SystemGroupUpdateIn,
    TreeOut,
)
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.cabinet import Cabinet
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.project import Project
from panelos_api.db.models.system_group import SystemGroup
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.services import project_service, system_group_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/projects", tags=["projects"])
groups_router = APIRouter(prefix="/system-groups", tags=["system-groups"])


# ─── Project endpoints ─────────────────────────────────────────────────────


@router.get("", response_model=Page[ProjectOut])
async def list_projects(
    cursor: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=100, le=200),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> Page[ProjectOut]:
    stmt = (
        select(Project)
        .where(Project.company_id == m.company_id, Project.archived_at.is_(None))
        .order_by(Project.id)
        .limit(limit)
    )
    if cursor is not None:
        stmt = stmt.where(Project.id > cursor)
    rows = (await db.execute(stmt)).scalars().all()
    next_cursor = str(rows[-1].id) if len(rows) == limit else None
    return Page[ProjectOut](
        items=[ProjectOut.model_validate(r) for r in rows], next_cursor=next_cursor
    )


@router.get("/tree", response_model=TreeOut)
async def project_tree(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> TreeOut:
    """Assemble the Project → System Group → Panel → Cabinet tree (4 scoped queries)."""
    projects = (
        await db.execute(
            select(Project)
            .where(Project.company_id == m.company_id, Project.archived_at.is_(None))
            .order_by(Project.name)
        )
    ).scalars().all()
    groups = (
        await db.execute(
            select(SystemGroup)
            .where(SystemGroup.company_id == m.company_id)
            .order_by(SystemGroup.name)
        )
    ).scalars().all()
    panels = (
        await db.execute(
            select(Panel)
            .where(Panel.company_id == m.company_id, Panel.archived_at.is_(None))
            .order_by(Panel.tag)
        )
    ).scalars().all()
    cabinets = (
        await db.execute(
            select(Cabinet)
            .where(Cabinet.company_id == m.company_id)
            .order_by(Cabinet.panel_id, Cabinet.position)
        )
    ).scalars().all()

    from panelos_api.api.v1.schemas.project import CabinetOut

    cabinets_by_panel: dict[uuid.UUID, list[CabinetOut]] = {}
    for c in cabinets:
        cabinets_by_panel.setdefault(c.panel_id, []).append(CabinetOut.model_validate(c))

    def to_panel_node(p: Panel) -> PanelNode:
        node = PanelNode.model_validate(p)
        node.cabinets = cabinets_by_panel.get(p.id, [])
        return node

    panels_by_group: dict[uuid.UUID, list[PanelNode]] = {}
    unassigned: list[PanelNode] = []
    for p in panels:
        n = to_panel_node(p)
        if p.system_group_id is None:
            unassigned.append(n)
        else:
            panels_by_group.setdefault(p.system_group_id, []).append(n)

    groups_by_project: dict[uuid.UUID, list[SystemGroupNode]] = {}
    for g in groups:
        node = SystemGroupNode.model_validate(g)
        node.panels = panels_by_group.get(g.id, [])
        groups_by_project.setdefault(g.project_id, []).append(node)

    project_nodes: list[ProjectNode] = []
    for proj in projects:
        node = ProjectNode.model_validate(proj)
        node.groups = groups_by_project.get(proj.id, [])
        project_nodes.append(node)

    return TreeOut(projects=project_nodes, unassigned_panels=unassigned)


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    project = await project_service.create_project(
        db, company_id=m.company_id, actor_id=m.user.id, **payload.model_dump()
    )
    return ProjectOut.model_validate(project)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    row = (
        await db.execute(
            select(Project).where(Project.id == project_id, Project.company_id == m.company_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("project not found")
    return ProjectOut.model_validate(row)


@router.get("/{project_id}/groups", response_model=list[SystemGroupOut])
async def project_groups(
    project_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[SystemGroupOut]:
    rows = (
        await db.execute(
            select(SystemGroup)
            .where(SystemGroup.company_id == m.company_id, SystemGroup.project_id == project_id)
            .order_by(SystemGroup.name)
        )
    ).scalars().all()
    return [SystemGroupOut.model_validate(g) for g in rows]


@router.get("/{project_id}/panels", response_model=list[PanelOut])
async def project_panels(
    project_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[PanelOut]:
    # Panels whose system_group is owned by this project.
    rows = (
        await db.execute(
            select(Panel)
            .join(SystemGroup, SystemGroup.id == Panel.system_group_id)
            .where(
                Panel.company_id == m.company_id,
                SystemGroup.project_id == project_id,
                Panel.archived_at.is_(None),
            )
            .order_by(Panel.tag)
        )
    ).scalars().all()
    return [PanelOut.model_validate(p) for p in rows]


@router.get("/{project_id}/status-history", response_model=list[ProjectStatusHistoryOut])
async def project_status_history(
    project_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[ProjectStatusHistoryOut]:
    rows = await project_service.list_status_history(
        db, company_id=m.company_id, project_id=project_id
    )
    return [ProjectStatusHistoryOut.model_validate(r) for r in rows]


@router.post(
    "/{project_id}/groups",
    response_model=SystemGroupOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_group_in_project(
    project_id: uuid.UUID,
    payload: SystemGroupCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> SystemGroupOut:
    group = await system_group_service.create_system_group(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        project_id=project_id,
        **payload.model_dump(),
    )
    return SystemGroupOut.model_validate(group)


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: uuid.UUID,
    payload: ProjectUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> ProjectOut:
    project = await project_service.update_project(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        project_id=project_id,
        changes=payload.model_dump(exclude_unset=True),
    )
    return ProjectOut.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_project(
    project_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await project_service.archive_project(
        db, company_id=m.company_id, actor_id=m.user.id, project_id=project_id
    )


# ─── System Group endpoints (under /system-groups) ─────────────────────────


@groups_router.get("/{group_id}", response_model=SystemGroupOut)
async def get_system_group(
    group_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> SystemGroupOut:
    row = (
        await db.execute(
            select(SystemGroup).where(
                SystemGroup.id == group_id, SystemGroup.company_id == m.company_id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("system group not found")
    return SystemGroupOut.model_validate(row)


@groups_router.put("/{group_id}", response_model=SystemGroupOut)
async def update_system_group(
    group_id: uuid.UUID,
    payload: SystemGroupUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> SystemGroupOut:
    group = await system_group_service.update_system_group(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        system_group_id=group_id,
        changes=payload.model_dump(exclude_unset=True),
    )
    return SystemGroupOut.model_validate(group)


@groups_router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_system_group(
    group_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await system_group_service.delete_system_group(
        db, company_id=m.company_id, actor_id=m.user.id, system_group_id=group_id
    )


@groups_router.get("/{group_id}/panels", response_model=list[PanelOut])
async def group_panels(
    group_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[PanelOut]:
    rows = (
        await db.execute(
            select(Panel)
            .where(
                Panel.company_id == m.company_id,
                Panel.system_group_id == group_id,
                Panel.archived_at.is_(None),
            )
            .order_by(Panel.tag)
        )
    ).scalars().all()
    return [PanelOut.model_validate(p) for p in rows]


@groups_router.get("/{group_id}/status-history", response_model=list[SystemGroupStatusHistoryOut])
async def group_status_history(
    group_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[SystemGroupStatusHistoryOut]:
    rows = await system_group_service.list_status_history(
        db, company_id=m.company_id, system_group_id=group_id
    )
    return [SystemGroupStatusHistoryOut.model_validate(r) for r in rows]
