"""Company + Location endpoints."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, status
from sqlalchemy import select

from panelos_api.api.v1.schemas.company import (
    CompanyOut,
    CompanyUpdateIn,
    LocationCreateIn,
    LocationOut,
    LocationUpdateIn,
)
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.company import Company
from panelos_api.db.models.location import Location
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/me", response_model=CompanyOut)
async def get_company(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> CompanyOut:
    company = await db.get(Company, m.company_id)
    if company is None:
        raise NotFound("company not found")
    return CompanyOut.model_validate(company)


@router.put("/me", response_model=CompanyOut)
async def update_company(
    payload: CompanyUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_ORG)),
    db: AsyncSession = Depends(get_db),
) -> CompanyOut:
    company = await db.get(Company, m.company_id)
    if company is None:
        raise NotFound("company not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(company, k, v)
    await db.flush()
    return CompanyOut.model_validate(company)


@router.get("/me/locations", response_model=list[LocationOut])
async def list_locations(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[LocationOut]:
    rows = (
        await db.execute(
            select(Location).where(Location.company_id == m.company_id).order_by(Location.code)
        )
    ).scalars().all()
    return [LocationOut.model_validate(r) for r in rows]


@router.post("/me/locations", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
async def create_location(
    payload: LocationCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_ORG)),
    db: AsyncSession = Depends(get_db),
) -> LocationOut:
    loc = Location(company_id=m.company_id, **payload.model_dump())
    db.add(loc)
    await db.flush()
    return LocationOut.model_validate(loc)


@router.put("/me/locations/{loc_id}", response_model=LocationOut)
async def update_location(
    loc_id: uuid.UUID,
    payload: LocationUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_ORG)),
    db: AsyncSession = Depends(get_db),
) -> LocationOut:
    loc = await db.get(Location, loc_id)
    if loc is None or loc.company_id != m.company_id:
        raise NotFound("location not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(loc, k, v)
    await db.flush()
    return LocationOut.model_validate(loc)


@router.delete("/me/locations/{loc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    loc_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_ORG)),
    db: AsyncSession = Depends(get_db),
) -> None:
    loc = await db.get(Location, loc_id)
    if loc is None or loc.company_id != m.company_id:
        raise NotFound("location not found")
    await db.delete(loc)
    await db.flush()
