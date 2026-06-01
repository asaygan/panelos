"""Public QR resolver + image."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Header, Request, Response

from panelos_api.api.v1.schemas.qr import QrResolveOut
from panelos_api.deps import CurrentUser, get_db, get_optional_user
from panelos_api.repositories.membership_repo import MembershipRepo
from panelos_api.services import qr_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/qr", tags=["qr"])


@router.get("/{token}", response_model=QrResolveOut)
async def resolve(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    viewer: CurrentUser | None = Depends(get_optional_user),
    user_agent: str | None = Header(default=None, alias="User-Agent"),
) -> QrResolveOut:
    ip = request.client.host if request.client else None
    viewer_company_ids = None
    viewer_id = None
    if viewer is not None:
        viewer_id = viewer.id
        memberships = await MembershipRepo(db).for_user(viewer.id)
        viewer_company_ids = {m.company_id for m in memberships}
    data = await qr_service.resolve_token(
        db,
        token=token,
        user_id=viewer_id,
        ip=ip,
        device=user_agent,
        viewer_company_ids=viewer_company_ids,
    )
    return QrResolveOut(**data)


@router.get("/{token}/image.png")
async def qr_png(token: str) -> Response:
    return Response(content=qr_service.render_png(token), media_type="image/png")


@router.get("/{token}/image.svg")
async def qr_svg(token: str) -> Response:
    return Response(content=qr_service.render_svg(token), media_type="image/svg+xml")
