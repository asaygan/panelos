"""Label template CRUD + set-default (visual editor backend)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, status

from panelos_api.api.v1.schemas.label_template import (
    LabelTemplateCreateIn,
    LabelTemplateOut,
    LabelTemplateUpdateIn,
)
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.label_template import LabelTemplate
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.repositories.label_template_repo import LabelTemplateRepo

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/label-templates", tags=["label-templates"])


@router.get("", response_model=list[LabelTemplateOut])
async def list_templates(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[LabelTemplateOut]:
    rows = await LabelTemplateRepo(db, m.company_id).list_all()
    return [LabelTemplateOut.model_validate(r) for r in rows]


@router.post("", response_model=LabelTemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: LabelTemplateCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.GENERATE_LABELS)),
    db: AsyncSession = Depends(get_db),
) -> LabelTemplateOut:
    repo = LabelTemplateRepo(db, m.company_id)
    tpl = LabelTemplate(company_id=m.company_id, **payload.model_dump())
    if tpl.is_default:
        await repo.clear_defaults()
    await repo.add(tpl)
    return LabelTemplateOut.model_validate(tpl)


@router.get("/{template_id}", response_model=LabelTemplateOut)
async def get_template(
    template_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> LabelTemplateOut:
    tpl = await LabelTemplateRepo(db, m.company_id).get(template_id)
    if tpl is None:
        raise NotFound("label template not found")
    return LabelTemplateOut.model_validate(tpl)


@router.put("/{template_id}", response_model=LabelTemplateOut)
async def update_template(
    template_id: uuid.UUID,
    payload: LabelTemplateUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.GENERATE_LABELS)),
    db: AsyncSession = Depends(get_db),
) -> LabelTemplateOut:
    repo = LabelTemplateRepo(db, m.company_id)
    tpl = await repo.get(template_id)
    if tpl is None:
        raise NotFound("label template not found")
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("is_default"):
        await repo.clear_defaults()
    for k, v in changes.items():
        setattr(tpl, k, v)
    await db.flush()
    return LabelTemplateOut.model_validate(tpl)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.GENERATE_LABELS)),
    db: AsyncSession = Depends(get_db),
) -> None:
    repo = LabelTemplateRepo(db, m.company_id)
    tpl = await repo.get(template_id)
    if tpl is None:
        raise NotFound("label template not found")
    await db.delete(tpl)
    await db.flush()


@router.post("/{template_id}/set-default", response_model=LabelTemplateOut)
async def set_default(
    template_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.GENERATE_LABELS)),
    db: AsyncSession = Depends(get_db),
) -> LabelTemplateOut:
    repo = LabelTemplateRepo(db, m.company_id)
    tpl = await repo.get(template_id)
    if tpl is None:
        raise NotFound("label template not found")
    await repo.set_default(tpl)
    return LabelTemplateOut.model_validate(tpl)
