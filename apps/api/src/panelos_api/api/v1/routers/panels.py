"""Panel CRUD + listing + activity."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select

from panelos_api.api.v1.schemas.common import Page
from panelos_api.api.v1.schemas.file import SheetOut
from panelos_api.api.v1.schemas.panel import (
    PanelCreateIn,
    PanelOut,
    PanelStatusHistoryOut,
    PanelUpdateIn,
)
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.panel_revision import PanelRevision
from panelos_api.db.models.revision_file import RevisionFile
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.repositories.panel_repo import PanelRepo
from panelos_api.repositories.scan_repo import ScanRepo
from panelos_api.services import panel_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/panels", tags=["panels"])


@router.get("", response_model=Page[PanelOut])
async def list_panels(
    location_id: uuid.UUID | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    q: str | None = Query(default=None),
    cursor: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> Page[PanelOut]:
    repo = PanelRepo(db, m.company_id)
    rows = await repo.list_filtered(
        location_id=location_id, status=status_filter, q=q, cursor=cursor, limit=limit
    )
    next_cursor = str(rows[-1].id) if len(rows) == limit else None
    return Page[PanelOut](items=[PanelOut.model_validate(p) for p in rows], next_cursor=next_cursor)


@router.post("", response_model=PanelOut, status_code=status.HTTP_201_CREATED)
async def create_panel(
    payload: PanelCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> PanelOut:
    panel = await panel_service.create_panel(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        **payload.model_dump(),
    )
    return PanelOut.model_validate(panel)


@router.get("/{panel_id}", response_model=PanelOut)
async def get_panel(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> PanelOut:
    panel = await PanelRepo(db, m.company_id).get(panel_id)
    if panel is None:
        raise NotFound("panel not found")
    return PanelOut.model_validate(panel)


@router.put("/{panel_id}", response_model=PanelOut)
async def update_panel(
    panel_id: uuid.UUID,
    payload: PanelUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> PanelOut:
    panel = await panel_service.update_metadata(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        panel_id=panel_id,
        changes=payload.model_dump(exclude_unset=True),
    )
    return PanelOut.model_validate(panel)


@router.delete("/{panel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_panel(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await panel_service.archive_panel(
        db, company_id=m.company_id, actor_id=m.user.id, panel_id=panel_id
    )


@router.get("/{panel_id}/status-history", response_model=list[PanelStatusHistoryOut])
async def panel_status_history(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[PanelStatusHistoryOut]:
    """Lifecycle timeline for a panel — every status transition, newest first."""
    rows = await panel_service.list_status_history(
        db, company_id=m.company_id, panel_id=panel_id
    )
    return [PanelStatusHistoryOut.model_validate(r) for r in rows]


@router.get("/{panel_id}/sheets", response_model=list[SheetOut])
async def panel_sheets(
    panel_id: uuid.UUID,
    revision_id: uuid.UUID | None = None,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[SheetOut]:
    """Attached sheets for a revision (for thumbnails / PDF viewer).

    With ``revision_id`` returns that revision's sheets. Otherwise prefers the
    most recent revision (draft-aware) so freshly uploaded sheets show, falling
    back to the active revision.
    """
    panel = await PanelRepo(db, m.company_id).get(panel_id)
    if panel is None:
        raise NotFound("panel not found")
    if revision_id is not None:
        rev_id: uuid.UUID | None = revision_id
    else:
        latest_rev_id = (
            await db.execute(
                select(PanelRevision.id)
                .where(PanelRevision.panel_id == panel_id)
                .order_by(PanelRevision.revision_number.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        rev_id = latest_rev_id or panel.active_revision_id
    if rev_id is None:
        return []
    rows = (
        await db.execute(
            select(RevisionFile)
            .where(RevisionFile.revision_id == rev_id)
            .order_by(RevisionFile.sheet_number)
        )
    ).scalars().all()
    return [SheetOut.model_validate(r) for r in rows]


@router.get("/{panel_id}/activity")
async def panel_activity(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> dict[str, list[dict[str, str]]]:
    panel = await PanelRepo(db, m.company_id).get(panel_id)
    if panel is None:
        raise NotFound("panel not found")
    scans = await ScanRepo(db).for_panel(panel.id)
    return {
        "scans": [
            {"id": str(s.id), "at": s.at.isoformat(), "device": s.device or ""} for s in scans
        ]
    }
