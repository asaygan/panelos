"""Component (BOM) endpoints — per-revision rows + CSV import."""

from __future__ import annotations

import csv
import io
import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, File, UploadFile, status

from panelos_api.api.v1.schemas.component import (
    ComponentCreateIn,
    ComponentOut,
    ComponentUpdateIn,
)
from panelos_api.core.exceptions import NotFound, ValidationFailed
from panelos_api.core.rbac import Permission
from panelos_api.db.models.component import Component
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.repositories.component_repo import ComponentRepo

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["components"])

CSV_COLUMNS = ("slot", "ref", "description", "part_number", "rating", "type", "status")


async def _revision_in_company(
    db: AsyncSession, revision_id: uuid.UUID, company_id: uuid.UUID
) -> PanelRevision:
    rev = await db.get(PanelRevision, revision_id)
    if rev is None:
        raise NotFound("revision not found")
    panel = await db.get(Panel, rev.panel_id)
    if panel is None or panel.company_id != company_id:
        raise NotFound("revision not found")
    return rev


async def _component_in_company(
    db: AsyncSession, component_id: uuid.UUID, company_id: uuid.UUID
) -> Component:
    comp = await db.get(Component, component_id)
    if comp is None:
        raise NotFound("component not found")
    await _revision_in_company(db, comp.revision_id, company_id)
    return comp


@router.get("/panels/{panel_id}/components", response_model=list[ComponentOut])
async def list_panel_components(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[ComponentOut]:
    panel = await db.get(Panel, panel_id)
    if panel is None or panel.company_id != m.company_id:
        raise NotFound("panel not found")
    if panel.active_revision_id is None:
        return []
    rows = await ComponentRepo(db).for_revision(panel.active_revision_id)
    return [ComponentOut.model_validate(r) for r in rows]


@router.get("/revisions/{revision_id}/components", response_model=list[ComponentOut])
async def list_revision_components(
    revision_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[ComponentOut]:
    await _revision_in_company(db, revision_id, m.company_id)
    rows = await ComponentRepo(db).for_revision(revision_id)
    return [ComponentOut.model_validate(r) for r in rows]


@router.post(
    "/revisions/{revision_id}/components",
    response_model=ComponentOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_component(
    revision_id: uuid.UUID,
    payload: ComponentCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CREATE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> ComponentOut:
    await _revision_in_company(db, revision_id, m.company_id)
    comp = await ComponentRepo(db).create(revision_id=revision_id, **payload.model_dump())
    return ComponentOut.model_validate(comp)


@router.put("/components/{component_id}", response_model=ComponentOut)
async def update_component(
    component_id: uuid.UUID,
    payload: ComponentUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.CREATE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> ComponentOut:
    comp = await _component_in_company(db, component_id, m.company_id)
    comp = await ComponentRepo(db).update(comp, payload.model_dump(exclude_unset=True))
    return ComponentOut.model_validate(comp)


@router.delete("/components/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(
    component_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.CREATE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> None:
    comp = await _component_in_company(db, component_id, m.company_id)
    await ComponentRepo(db).delete(comp)


@router.post(
    "/revisions/{revision_id}/components/import",
    response_model=list[ComponentOut],
    status_code=status.HTTP_201_CREATED,
)
async def import_components(
    revision_id: uuid.UUID,
    file: UploadFile = File(...),
    m: CurrentMembership = Depends(require_permission(Permission.CREATE_REVISION)),
    db: AsyncSession = Depends(get_db),
) -> list[ComponentOut]:
    """Bulk-import BOM rows from a CSV with columns:
    ``slot,ref,description,part_number,rating,type,status`` (status optional → "ok").
    """
    await _revision_in_company(db, revision_id, m.company_id)
    raw = await file.read()
    rows = parse_components_csv(raw, revision_id)
    if not rows:
        raise ValidationFailed("no rows parsed from CSV")
    comps = await ComponentRepo(db).bulk_create(rows)
    return [ComponentOut.model_validate(c) for c in comps]


def parse_components_csv(raw: bytes, revision_id: uuid.UUID) -> list[dict[str, object]]:
    """Parse BOM CSV bytes into component row dicts. Stdlib ``csv`` only."""
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    out: list[dict[str, object]] = []
    for rec in reader:
        norm = {(k or "").strip().lower(): (v or "").strip() for k, v in rec.items()}
        slot = norm.get("slot", "")
        ref = norm.get("ref", "")
        description = norm.get("description", "")
        if not (slot or ref or description):
            continue
        out.append(
            {
                "revision_id": revision_id,
                "slot": slot,
                "ref": ref,
                "description": description,
                "part_number": norm.get("part_number") or None,
                "rating": norm.get("rating") or None,
                "type": norm.get("type") or None,
                "status": norm.get("status") or "ok",
            }
        )
    return out
