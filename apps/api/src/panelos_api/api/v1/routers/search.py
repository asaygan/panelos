"""Command palette search."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query

from panelos_api.deps import CurrentMembership, get_current_membership, get_db
from panelos_api.services import search_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def search(
    q: str = Query(default=""),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> dict[str, list[dict[str, str]]]:
    items = await search_service.search(db, company_id=m.company_id, q=q)
    return {"items": items}
