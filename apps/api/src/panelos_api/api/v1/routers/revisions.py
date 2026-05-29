"""Revision endpoints + queue."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query, status

from panelos_api.api.v1.schemas.revision import RevisionCreateIn, RevisionOut
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import RevisionStatus
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.repositories.revision_repo import RevisionRepo
from panelos_api.services import revision_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["revisions"])


@router.post(
    "/panels/{panel_id}/revisions",
    response_model=RevisionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_draft(
    panel_id: uuid.UUID,
    payload: RevisionCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CREATE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    rev = await revision_service.create_draft(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        panel_id=panel_id,
        change_summary=payload.change_summary,
    )
    return RevisionOut.model_validate(rev)


@router.get("/panels/{panel_id}/revisions", response_model=list[RevisionOut])
async def list_panel_revisions(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[RevisionOut]:
    panel = await db.get(Panel, panel_id)
    if panel is None or panel.company_id != m.company_id:
        raise NotFound("panel not found")
    rows = await RevisionRepo(db).list_for_panel(panel_id)
    return [RevisionOut.model_validate(r) for r in rows]


@router.post("/revisions/{revision_id}/submit", response_model=RevisionOut)
async def submit(
    revision_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CREATE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    rev = await revision_service.transition(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        revision_id=revision_id,
        action="submit",
    )
    return RevisionOut.model_validate(rev)


@router.post("/revisions/{revision_id}/approve", response_model=RevisionOut)
async def approve(
    revision_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.APPROVE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    rev = await revision_service.transition(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        revision_id=revision_id,
        action="approve",
    )
    return RevisionOut.model_validate(rev)


@router.post("/revisions/{revision_id}/reject", response_model=RevisionOut)
async def reject(
    revision_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.APPROVE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    rev = await revision_service.transition(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        revision_id=revision_id,
        action="reject",
    )
    return RevisionOut.model_validate(rev)


@router.get("/revisions", response_model=list[RevisionOut])
async def queue(
    filter_: str = Query(default="all", alias="filter"),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[RevisionOut]:
    statuses = {
        "draft": [RevisionStatus.DRAFT],
        "review": [RevisionStatus.REVIEW],
        "all": [RevisionStatus.DRAFT, RevisionStatus.REVIEW],
    }.get(filter_, [RevisionStatus.DRAFT, RevisionStatus.REVIEW])
    rows = await RevisionRepo(db).queue(statuses=statuses)
    return [RevisionOut.model_validate(r) for r in rows]


@router.get("/revisions/{revision_id}", response_model=RevisionOut)
async def get_revision(
    revision_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    rev = await RevisionRepo(db).get(revision_id)
    if rev is None:
        raise NotFound("revision not found")
    return RevisionOut.model_validate(rev)
