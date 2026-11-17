"""Revision endpoints + review queue."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import func, select

from panelos_api.api.v1.schemas.revision import (
    RevisionCreateIn,
    RevisionDecisionIn,
    RevisionOut,
    RevisionUpdateIn,
)
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.component import Component
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.db.models.revision_file import RevisionFile
from panelos_api.db.models.user import User
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.repositories.revision_repo import RevisionRepo
from panelos_api.services import revision_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["revisions"])


async def _present(db: AsyncSession, revs: list[PanelRevision]) -> list[RevisionOut]:
    """Attach panel identity, people's names and content counts in 4 queries total."""

    if not revs:
        return []
    rev_ids = [r.id for r in revs]
    panel_ids = {r.panel_id for r in revs}
    user_ids = {
        uid
        for r in revs
        for uid in (r.created_by, r.submitted_by, r.approved_by, r.rejected_by)
        if uid is not None
    }
    panels = {
        row.id: row
        for row in (
            await db.execute(select(Panel.id, Panel.tag, Panel.name).where(Panel.id.in_(panel_ids)))
        ).all()
    }
    names: dict[uuid.UUID, str] = {}
    if user_ids:
        names = {
            row.id: row.name
            for row in (
                await db.execute(select(User.id, User.name).where(User.id.in_(user_ids)))
            ).all()
        }
    sheets = dict(
        (
            await db.execute(
                select(RevisionFile.revision_id, func.count())
                .where(RevisionFile.revision_id.in_(rev_ids))
                .group_by(RevisionFile.revision_id)
            )
        ).all()
    )
    comps = dict(
        (
            await db.execute(
                select(Component.revision_id, func.count())
                .where(Component.revision_id.in_(rev_ids))
                .group_by(Component.revision_id)
            )
        ).all()
    )
    out: list[RevisionOut] = []
    for r in revs:
        o = RevisionOut.model_validate(r)
        panel = panels.get(r.panel_id)
        o.panel_tag = panel.tag if panel else None
        o.panel_name = panel.name if panel else None
        o.created_by_name = names.get(r.created_by) if r.created_by else None
        o.submitted_by_name = names.get(r.submitted_by) if r.submitted_by else None
        o.approved_by_name = names.get(r.approved_by) if r.approved_by else None
        o.rejected_by_name = names.get(r.rejected_by) if r.rejected_by else None
        o.sheet_count = int(sheets.get(r.id, 0))
        o.component_count = int(comps.get(r.id, 0))
        out.append(o)
    return out


async def _one(db: AsyncSession, rev: PanelRevision) -> RevisionOut:
    return (await _present(db, [rev]))[0]


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
    return await _one(db, rev)


@router.get("/panels/{panel_id}/revisions", response_model=list[RevisionOut])
async def list_panel_revisions(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[RevisionOut]:
    panel = await db.get(Panel, panel_id)
    if panel is None or panel.company_id != m.company_id:
        raise NotFound("panel not found")
    return await _present(db, await RevisionRepo(db).list_for_panel(panel_id))


@router.patch("/revisions/{revision_id}", response_model=RevisionOut)
async def update_draft(
    revision_id: uuid.UUID,
    payload: RevisionUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CREATE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    """Edit a draft's change summary."""
    rev = await RevisionRepo(db).get_in_company(revision_id, m.company_id)
    if rev is None:
        raise NotFound("revision not found")
    revision_service.ensure_editable(rev)
    if payload.change_summary is not None:
        rev.change_summary = payload.change_summary.strip() or None
    await db.flush()
    return await _one(db, rev)


async def _transition(
    db: AsyncSession,
    m: CurrentMembership,
    revision_id: uuid.UUID,
    action: revision_service.Action,
    note: str | None = None,
) -> RevisionOut:
    rev = await revision_service.transition(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        actor_role=m.role,
        actor_name=m.user.name,
        revision_id=revision_id,
        action=action,
        note=note,
    )
    return await _one(db, rev)


@router.post("/revisions/{revision_id}/submit", response_model=RevisionOut)
async def submit(
    revision_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CREATE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    return await _transition(db, m, revision_id, "submit")


@router.post("/revisions/{revision_id}/approve", response_model=RevisionOut)
async def approve(
    revision_id: uuid.UUID,
    payload: RevisionDecisionIn | None = None,
    m: CurrentMembership = Depends(require_permission(Permission.APPROVE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    return await _transition(db, m, revision_id, "approve", payload.note if payload else None)


@router.post("/revisions/{revision_id}/reject", response_model=RevisionOut)
async def reject(
    revision_id: uuid.UUID,
    payload: RevisionDecisionIn | None = None,
    m: CurrentMembership = Depends(require_permission(Permission.APPROVE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    return await _transition(db, m, revision_id, "reject", payload.note if payload else None)


_QUEUE_FILTERS: dict[str, list[RevisionStatus]] = {
    "draft": [RevisionStatus.DRAFT],
    "review": [RevisionStatus.REVIEW],
    "all": [RevisionStatus.DRAFT, RevisionStatus.REVIEW],
    "approved": [RevisionStatus.APPROVED],
    "rejected": [RevisionStatus.REJECTED],
    "history": [RevisionStatus.APPROVED, RevisionStatus.REJECTED, RevisionStatus.SUPERSEDED],
}


@router.get("/revisions", response_model=list[RevisionOut])
async def queue(
    filter_: str = Query(default="all", alias="filter"),
    limit: int = Query(default=100, ge=1, le=200),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[RevisionOut]:
    statuses = _QUEUE_FILTERS.get(filter_, _QUEUE_FILTERS["all"])
    rows = await RevisionRepo(db).queue(company_id=m.company_id, statuses=statuses, limit=limit)
    return await _present(db, rows)


@router.get("/revisions/{revision_id}", response_model=RevisionOut)
async def get_revision(
    revision_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> RevisionOut:
    rev = await RevisionRepo(db).get_in_company(revision_id, m.company_id)
    if rev is None:
        raise NotFound("revision not found")
    return await _one(db, rev)
