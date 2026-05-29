"""Label rendering endpoints."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, status

from panelos_api.api.v1.schemas.label import (
    BatchRenderIn,
    BatchRenderOut,
    LabelOut,
    LabelRenderIn,
)
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.label import Label
from panelos_api.deps import (
    CurrentMembership,
    get_current_membership,
    get_db,
    get_storage,
    require_permission,
)
from panelos_api.services import label_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.storage.base import StorageProvider

router = APIRouter(prefix="/labels", tags=["labels"])


@router.post("", response_model=LabelOut, status_code=status.HTTP_201_CREATED)
async def render(
    payload: LabelRenderIn,
    m: CurrentMembership = Depends(require_permission(Permission.GENERATE_LABELS)),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
) -> LabelOut:
    label = await label_service.render_for_panel(
        db,
        storage=storage,
        company_id=m.company_id,
        actor_id=m.user.id,
        panel_id=payload.panel_id,
        template=payload.template,
        fmt=payload.format,
        size=payload.size,
        fields=payload.fields,
        template_id=payload.template_id,
    )
    out = LabelOut.model_validate(label)
    out.png_url, out.svg_url = await label_service.urls_for_label(storage, label)
    return out


@router.post("/batch", response_model=BatchRenderOut, status_code=status.HTTP_202_ACCEPTED)
async def render_batch(
    payload: BatchRenderIn,
    m: CurrentMembership = Depends(require_permission(Permission.GENERATE_LABELS)),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
) -> BatchRenderOut:
    pdf_url, count = await label_service.render_batch_pdf(
        db,
        storage=storage,
        company_id=m.company_id,
        actor_id=m.user.id,
        panel_ids=payload.panel_ids,
        template=payload.template,
        template_id=payload.template_id,
    )
    return BatchRenderOut(pdf_url=pdf_url, count=count)


@router.get("/{label_id}", response_model=LabelOut)
async def get_label(
    label_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
) -> LabelOut:
    label = await db.get(Label, label_id)
    if label is None or label.company_id != m.company_id:
        raise NotFound("label not found")
    out = LabelOut.model_validate(label)
    out.png_url, out.svg_url = await label_service.urls_for_label(storage, label)
    return out
