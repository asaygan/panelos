"""Section CRUD (nested under a panel)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, status

from panelos_api.api.v1.schemas.section import (
    SectionCreateIn,
    SectionMoveIn,
    SectionOut,
    SectionUpdateIn,
)
from panelos_api.core.rbac import Permission
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.services import section_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["sections"])


@router.get("/panels/{panel_id}/sections", response_model=list[SectionOut])
async def list_sections(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[SectionOut]:
    rows = await section_service.list_for_panel(db, company_id=m.company_id, panel_id=panel_id)
    return [SectionOut.model_validate(r) for r in rows]


@router.post(
    "/panels/{panel_id}/sections",
    response_model=SectionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_section(
    panel_id: uuid.UUID,
    payload: SectionCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> SectionOut:
    section = await section_service.create_section(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        panel_id=panel_id,
        **payload.model_dump(),
    )
    return SectionOut.model_validate(section)


@router.put("/sections/{section_id}", response_model=SectionOut)
async def update_section(
    section_id: uuid.UUID,
    payload: SectionUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> SectionOut:
    section = await section_service.update_section(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        section_id=section_id,
        changes=payload.model_dump(exclude_unset=True),
    )
    return SectionOut.model_validate(section)


@router.post("/sections/{section_id}/move", response_model=SectionOut)
async def move_section(
    section_id: uuid.UUID,
    payload: SectionMoveIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> SectionOut:
    section = await section_service.move_section(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        section_id=section_id,
        target_panel_id=payload.panel_id,
    )
    return SectionOut.model_validate(section)


@router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    section_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await section_service.delete_section(
        db, company_id=m.company_id, actor_id=m.user.id, section_id=section_id
    )
