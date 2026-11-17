"""Company + Location endpoints."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select

from panelos_api.api.v1.schemas.company import (
    CompanyOut,
    CompanyUpdateIn,
    LocationCreateIn,
    LocationOut,
    LocationUpdateIn,
)
from panelos_api.core.exceptions import NotFound, ValidationFailed
from panelos_api.core.rbac import Permission
from panelos_api.db.models.company import Company
from panelos_api.db.models.location import Location
from panelos_api.deps import (
    CurrentMembership,
    get_current_membership,
    get_db,
    get_storage,
    require_permission,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.storage.base import StorageProvider

router = APIRouter(prefix="/companies", tags=["companies"])

_LOGO_SIGNATURES = (b"\x89PNG\r\n\x1a\n", b"\xff\xd8\xff", b"<svg", b"<?xml", b"RIFF")


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
    storage: StorageProvider = Depends(get_storage),
) -> CompanyOut:
    company = await db.get(Company, m.company_id)
    if company is None:
        raise NotFound("company not found")
    changes = payload.model_dump(exclude_unset=True)
    logo_key = changes.get("logo_key")
    # The label renderer reads this key straight from storage, so it must be an
    # object this company uploaded — never an arbitrary (other tenant's) key.
    if logo_key and (not logo_key.startswith(f"uploads/{m.company_id}/") or ".." in logo_key):
        raise ValidationFailed("logo_key must reference a file uploaded by this company")
    if logo_key:
        get_bytes = getattr(storage, "get_bytes", None)
        head = (await get_bytes(logo_key, 16)).lstrip() if get_bytes else b""
        if get_bytes and not head.startswith(_LOGO_SIGNATURES):
            raise ValidationFailed("logo must be a PNG, JPEG, SVG or WebP image")
    for k, v in changes.items():
        setattr(company, k, v)
    await db.flush()
    return CompanyOut.model_validate(company)


@router.get("/me/logo")
async def company_logo(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
) -> RedirectResponse:
    """Redirect to a short-lived URL for the company logo (usable as ``<img src>``)."""
    company = await db.get(Company, m.company_id)
    if company is None or not company.logo_key:
        raise NotFound("no logo")
    url = await storage.presign_get(company.logo_key, 300)
    return RedirectResponse(url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/me/locations", response_model=list[LocationOut])
async def list_locations(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[LocationOut]:
    rows = (
        (
            await db.execute(
                select(Location).where(Location.company_id == m.company_id).order_by(Location.code)
            )
        )
        .scalars()
        .all()
    )
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
