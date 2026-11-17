"""In-app notifications for the signed-in member."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query

from panelos_api.api.v1.schemas.notification import NotificationListOut, NotificationOut
from panelos_api.deps import CurrentMembership, get_current_membership, get_db
from panelos_api.services import notification_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListOut)
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    before: datetime | None = Query(default=None),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> NotificationListOut:
    rows = await notification_service.list_for_user(
        db,
        company_id=m.company_id,
        user_id=m.user.id,
        unread_only=unread_only,
        limit=limit,
        before=before,
    )
    items = []
    for n in rows:
        title, body = notification_service.render(n, m.user.locale)
        items.append(
            NotificationOut(
                id=n.id,
                kind=n.kind,
                title=title,
                body=body,
                params=n.params or {},
                link=n.link,
                read_at=n.read_at,
                created_at=n.created_at,
            )
        )
    unread = await notification_service.unread_count(db, company_id=m.company_id, user_id=m.user.id)
    return NotificationListOut(
        items=items,
        unread=unread,
        next_before=rows[-1].created_at if len(rows) == limit else None,
    )


@router.get("/unread-count")
async def unread_count(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    return {
        "unread": await notification_service.unread_count(
            db, company_id=m.company_id, user_id=m.user.id
        )
    }


@router.post("/read-all")
async def read_all(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    n = await notification_service.mark_read(db, company_id=m.company_id, user_id=m.user.id)
    return {"updated": n}


@router.post("/{notification_id}/read")
async def read_one(
    notification_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    n = await notification_service.mark_read(
        db, company_id=m.company_id, user_id=m.user.id, notification_id=notification_id
    )
    return {"updated": n}
