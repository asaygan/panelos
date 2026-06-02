"""Cabinet CRUD (nested under a panel)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, status

from panelos_api.api.v1.schemas.project import (
    CabinetCreateIn,
    CabinetMoveIn,
    CabinetOut,
    CabinetUpdateIn,
)
from panelos_api.core.rbac import Permission
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.services import cabinet_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["cabinets"])


@router.get("/panels/{panel_id}/cabinets", response_model=list[CabinetOut])
async def list_cabinets(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[CabinetOut]:
    rows = await cabinet_service.list_for_panel(db, company_id=m.company_id, panel_id=panel_id)
    return [CabinetOut.model_validate(r) for r in rows]


@router.post(
    "/panels/{panel_id}/cabinets",
    response_model=CabinetOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_cabinet(
    panel_id: uuid.UUID,
    payload: CabinetCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> CabinetOut:
    cabinet = await cabinet_service.create_cabinet(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        panel_id=panel_id,
        **payload.model_dump(),
    )
    return CabinetOut.model_validate(cabinet)


@router.put("/cabinets/{cabinet_id}", response_model=CabinetOut)
async def update_cabinet(
    cabinet_id: uuid.UUID,
    payload: CabinetUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> CabinetOut:
    cabinet = await cabinet_service.update_cabinet(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        cabinet_id=cabinet_id,
        changes=payload.model_dump(exclude_unset=True),
    )
    return CabinetOut.model_validate(cabinet)


@router.post("/cabinets/{cabinet_id}/move", response_model=CabinetOut)
async def move_cabinet(
    cabinet_id: uuid.UUID,
    payload: CabinetMoveIn,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> CabinetOut:
    cabinet = await cabinet_service.move_cabinet(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        cabinet_id=cabinet_id,
        target_panel_id=payload.panel_id,
    )
    return CabinetOut.model_validate(cabinet)


@router.delete("/cabinets/{cabinet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cabinet(
    cabinet_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CRUD_PANELS)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await cabinet_service.delete_cabinet(
        db, company_id=m.company_id, actor_id=m.user.id, cabinet_id=cabinet_id
    )
