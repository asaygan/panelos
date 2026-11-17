"""Issues, maintenance records/plans and attachments."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import func, select

from panelos_api.api.v1.schemas.fieldwork import (
    AttachmentCreateIn,
    AttachmentOut,
    IssueCreateIn,
    IssueDetailOut,
    IssueOut,
    IssueUpdateIn,
    MaintenanceCreateIn,
    MaintenanceOut,
    PlanCreateIn,
    PlanOut,
    PlanUpdateIn,
)
from panelos_api.core.rbac import Permission
from panelos_api.db.models.attachment import Attachment
from panelos_api.db.models.issue import OPEN_STATUSES, Issue
from panelos_api.db.models.maintenance import MaintenancePlan, MaintenanceRecord
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.pdf_file import PdfFile
from panelos_api.db.models.user import User
from panelos_api.deps import (
    CurrentMembership,
    get_current_membership,
    get_db,
    get_storage,
    require_permission,
)
from panelos_api.services import fieldwork_service, panel_access

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.storage.base import StorageProvider

router = APIRouter(tags=["fieldwork"])

_SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


# ---------------------------------------------------------------------------
# Presenters (batch lookups — no per-row queries)
# ---------------------------------------------------------------------------


async def _names(db: AsyncSession, ids: set[uuid.UUID | None]) -> dict[uuid.UUID, str]:
    wanted = {i for i in ids if i is not None}
    if not wanted:
        return {}
    return {
        row.id: row.name
        for row in (await db.execute(select(User.id, User.name).where(User.id.in_(wanted)))).all()
    }


async def _panels(db: AsyncSession, ids: set[uuid.UUID]) -> dict[uuid.UUID, Any]:
    if not ids:
        return {}
    return {
        row.id: row
        for row in (
            await db.execute(select(Panel.id, Panel.tag, Panel.name).where(Panel.id.in_(ids)))
        ).all()
    }


async def _attachment_counts(
    db: AsyncSession, column: Any, ids: list[uuid.UUID]
) -> dict[uuid.UUID, int]:
    if not ids:
        return {}
    return {
        key: int(count)
        for key, count in (
            await db.execute(select(column, func.count()).where(column.in_(ids)).group_by(column))
        ).all()
    }


async def _present_issues(db: AsyncSession, issues: list[Issue]) -> list[IssueOut]:
    names = await _names(db, {u for i in issues for u in (i.reported_by, i.assigned_to)})
    panels = await _panels(db, {i.panel_id for i in issues})
    counts = await _attachment_counts(db, Attachment.issue_id, [i.id for i in issues])
    out = []
    for i in issues:
        o = IssueOut.model_validate(i)
        p = panels.get(i.panel_id)
        o.panel_tag, o.panel_name = (p.tag, p.name) if p else (None, None)
        o.reported_by_name = names.get(i.reported_by) if i.reported_by else None
        o.assigned_to_name = names.get(i.assigned_to) if i.assigned_to else None
        o.attachment_count = counts.get(i.id, 0)
        out.append(o)
    return out


async def _present_attachments(
    db: AsyncSession, storage: StorageProvider, rows: list[Attachment]
) -> list[AttachmentOut]:
    if not rows:
        return []
    files = {
        f.id: f
        for f in (
            await db.execute(select(PdfFile).where(PdfFile.id.in_({a.file_id for a in rows})))
        )
        .scalars()
        .all()
    }
    names = await _names(db, {a.uploaded_by for a in rows})
    out = []
    for a in rows:
        f = files.get(a.file_id)
        if f is None:
            continue
        out.append(
            AttachmentOut(
                id=a.id,
                panel_id=a.panel_id,
                issue_id=a.issue_id,
                maintenance_id=a.maintenance_id,
                file_id=a.file_id,
                filename=f.original_filename,
                mime=f.mime,
                byte_size=f.byte_size,
                caption=a.caption,
                uploaded_by=a.uploaded_by,
                uploaded_by_name=names.get(a.uploaded_by) if a.uploaded_by else None,
                created_at=a.created_at,
                url=await storage.presign_get(f.storage_key, 3600),
            )
        )
    return out


async def _present_maintenance(
    db: AsyncSession, rows: list[MaintenanceRecord]
) -> list[MaintenanceOut]:
    names = await _names(db, {r.performed_by for r in rows})
    panels = await _panels(db, {r.panel_id for r in rows})
    counts = await _attachment_counts(db, Attachment.maintenance_id, [r.id for r in rows])
    out = []
    for r in rows:
        o = MaintenanceOut.model_validate(r)
        p = panels.get(r.panel_id)
        o.panel_tag, o.panel_name = (p.tag, p.name) if p else (None, None)
        if not o.performed_by_name and r.performed_by:
            o.performed_by_name = names.get(r.performed_by)
        o.attachment_count = counts.get(r.id, 0)
        out.append(o)
    return out


async def _present_plans(db: AsyncSession, rows: list[MaintenancePlan]) -> list[PlanOut]:
    panels = await _panels(db, {r.panel_id for r in rows})
    today = datetime.now(UTC).date()
    out = []
    for r in rows:
        o = PlanOut.model_validate(r)
        p = panels.get(r.panel_id)
        o.panel_tag, o.panel_name = (p.tag, p.name) if p else (None, None)
        o.days_until_due = (r.next_due_on - today).days
        out.append(o)
    return out


# ---------------------------------------------------------------------------
# Issues
# ---------------------------------------------------------------------------


@router.post(
    "/panels/{panel_id}/issues", response_model=IssueOut, status_code=status.HTTP_201_CREATED
)
async def report_issue(
    panel_id: uuid.UUID,
    payload: IssueCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.REPORT_ISSUE)),
    db: AsyncSession = Depends(get_db),
) -> IssueOut:
    issue = await fieldwork_service.create_issue(db, m, panel_id=panel_id, **payload.model_dump())
    return (await _present_issues(db, [issue]))[0]


@router.get("/issues", response_model=list[IssueOut])
async def list_issues(
    state: str = Query(default="open", pattern="^(open|closed|all)$"),
    severity: str | None = Query(default=None),
    panel_id: uuid.UUID | None = Query(default=None),
    mine: bool = Query(default=False, description="Only issues assigned to me"),
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[IssueOut]:
    stmt = (
        select(Issue)
        .join(Panel, Panel.id == Issue.panel_id)
        .where(Issue.company_id == m.company_id)
    )
    stmt = panel_access.restrict_panels(stmt, await panel_access.allowed_location_ids(db, m))
    if state == "open":
        stmt = stmt.where(Issue.status.in_(OPEN_STATUSES))
    elif state == "closed":
        stmt = stmt.where(Issue.status.not_in(OPEN_STATUSES))
    if severity:
        stmt = stmt.where(Issue.severity == severity)
    if panel_id:
        stmt = stmt.where(Issue.panel_id == panel_id)
    if mine:
        stmt = stmt.where(Issue.assigned_to == m.user.id)
    stmt = stmt.order_by(Issue.created_at.desc()).limit(limit).offset(offset)
    return await _present_issues(db, list((await db.execute(stmt)).scalars().all()))


@router.get("/panels/{panel_id}/issues", response_model=list[IssueOut])
async def panel_issues(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[IssueOut]:
    panel = await panel_access.get_panel(db, m, panel_id)
    rows = (
        (
            await db.execute(
                select(Issue).where(Issue.panel_id == panel.id).order_by(Issue.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return await _present_issues(db, list(rows))


@router.get("/issues/{issue_id}", response_model=IssueDetailOut)
async def get_issue(
    issue_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
) -> IssueDetailOut:
    issue = await fieldwork_service.get_issue(db, m, issue_id)
    base = (await _present_issues(db, [issue]))[0]
    atts = (
        (
            await db.execute(
                select(Attachment)
                .where(Attachment.issue_id == issue.id)
                .order_by(Attachment.created_at)
            )
        )
        .scalars()
        .all()
    )
    return IssueDetailOut(
        **base.model_dump(), attachments=await _present_attachments(db, storage, list(atts))
    )


@router.patch("/issues/{issue_id}", response_model=IssueOut)
async def update_issue(
    issue_id: uuid.UUID,
    payload: IssueUpdateIn,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> IssueOut:
    issue = await fieldwork_service.update_issue(
        db, m, issue_id, payload.model_dump(exclude_unset=True)
    )
    return (await _present_issues(db, [issue]))[0]


# ---------------------------------------------------------------------------
# Maintenance
# ---------------------------------------------------------------------------


@router.post(
    "/panels/{panel_id}/maintenance",
    response_model=MaintenanceOut,
    status_code=status.HTTP_201_CREATED,
)
async def record_maintenance(
    panel_id: uuid.UUID,
    payload: MaintenanceCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_MAINTENANCE)),
    db: AsyncSession = Depends(get_db),
) -> MaintenanceOut:
    rec = await fieldwork_service.record_maintenance(
        db, m, panel_id=panel_id, data=payload.model_dump()
    )
    return (await _present_maintenance(db, [rec]))[0]


@router.get("/panels/{panel_id}/maintenance", response_model=list[MaintenanceOut])
async def panel_maintenance(
    panel_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[MaintenanceOut]:
    panel = await panel_access.get_panel(db, m, panel_id)
    rows = (
        (
            await db.execute(
                select(MaintenanceRecord)
                .where(MaintenanceRecord.panel_id == panel.id)
                .order_by(MaintenanceRecord.performed_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return await _present_maintenance(db, list(rows))


@router.get("/maintenance", response_model=list[MaintenanceOut])
async def recent_maintenance(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[MaintenanceOut]:
    stmt = (
        select(MaintenanceRecord)
        .join(Panel, Panel.id == MaintenanceRecord.panel_id)
        .where(MaintenanceRecord.company_id == m.company_id)
    )
    stmt = panel_access.restrict_panels(stmt, await panel_access.allowed_location_ids(db, m))
    stmt = stmt.order_by(MaintenanceRecord.performed_at.desc()).limit(limit).offset(offset)
    return await _present_maintenance(db, list((await db.execute(stmt)).scalars().all()))


@router.get("/maintenance-plans", response_model=list[PlanOut])
async def list_plans(
    due: str = Query(default="all", pattern="^(all|overdue|soon)$"),
    panel_id: uuid.UUID | None = Query(default=None),
    include_inactive: bool = Query(default=False),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[PlanOut]:
    from datetime import timedelta

    today = datetime.now(UTC).date()
    stmt = (
        select(MaintenancePlan)
        .join(Panel, Panel.id == MaintenancePlan.panel_id)
        .where(MaintenancePlan.company_id == m.company_id, Panel.archived_at.is_(None))
    )
    stmt = panel_access.restrict_panels(stmt, await panel_access.allowed_location_ids(db, m))
    if not include_inactive:
        stmt = stmt.where(MaintenancePlan.active.is_(True))
    if panel_id:
        stmt = stmt.where(MaintenancePlan.panel_id == panel_id)
    if due == "overdue":
        stmt = stmt.where(MaintenancePlan.next_due_on < today)
    elif due == "soon":
        stmt = stmt.where(
            MaintenancePlan.next_due_on <= today + timedelta(days=fieldwork_service.DUE_SOON_DAYS)
        )
    stmt = stmt.order_by(MaintenancePlan.next_due_on.asc()).limit(500)
    return await _present_plans(db, list((await db.execute(stmt)).scalars().all()))


@router.post(
    "/panels/{panel_id}/maintenance-plans",
    response_model=PlanOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_plan(
    panel_id: uuid.UUID,
    payload: PlanCreateIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_MAINTENANCE)),
    db: AsyncSession = Depends(get_db),
) -> PlanOut:
    plan = await fieldwork_service.create_plan(db, m, panel_id=panel_id, data=payload.model_dump())
    return (await _present_plans(db, [plan]))[0]


@router.patch("/maintenance-plans/{plan_id}", response_model=PlanOut)
async def update_plan(
    plan_id: uuid.UUID,
    payload: PlanUpdateIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_MAINTENANCE)),
    db: AsyncSession = Depends(get_db),
) -> PlanOut:
    plan = await fieldwork_service.update_plan(
        db, m, plan_id, payload.model_dump(exclude_unset=True)
    )
    return (await _present_plans(db, [plan]))[0]


@router.delete("/maintenance-plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_MAINTENANCE)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await fieldwork_service.delete_plan(db, m, plan_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------


@router.get("/panels/{panel_id}/attachments", response_model=list[AttachmentOut])
async def panel_attachments(
    panel_id: uuid.UUID,
    maintenance_id: uuid.UUID | None = Query(default=None),
    only_general: bool = Query(
        default=False, description="Only files attached to the panel itself"
    ),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
) -> list[AttachmentOut]:
    panel = await panel_access.get_panel(db, m, panel_id)
    stmt = select(Attachment).where(Attachment.panel_id == panel.id)
    if maintenance_id:
        stmt = stmt.where(Attachment.maintenance_id == maintenance_id)
    if only_general:
        stmt = stmt.where(Attachment.issue_id.is_(None), Attachment.maintenance_id.is_(None))
    rows = (await db.execute(stmt.order_by(Attachment.created_at.desc()))).scalars().all()
    return await _present_attachments(db, storage, list(rows))


@router.post(
    "/panels/{panel_id}/attachments",
    response_model=list[AttachmentOut],
    status_code=status.HTTP_201_CREATED,
)
async def add_attachment(
    panel_id: uuid.UUID,
    payload: AttachmentCreateIn,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
) -> list[AttachmentOut]:
    # Anyone who can report issues or log maintenance may add photos/documents.
    if not (
        m.can(Permission.REPORT_ISSUE)
        or m.can(Permission.MANAGE_MAINTENANCE)
        or m.can(Permission.CRUD_PANELS)
    ):
        from panelos_api.core.exceptions import Forbidden

        raise Forbidden("permission denied: attachments")
    panel = await panel_access.get_panel(db, m, panel_id)
    if payload.issue_id:
        issue = await fieldwork_service.get_issue(db, m, payload.issue_id)
        if issue.panel_id != panel.id:
            from panelos_api.core.exceptions import NotFound

            raise NotFound("issue not found")
    rows = await fieldwork_service.attach_files(
        db,
        m,
        panel=panel,
        file_ids=[payload.file_id],
        issue_id=payload.issue_id,
        maintenance_id=payload.maintenance_id,
        caption=payload.caption,
    )
    return await _present_attachments(db, storage, rows)


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_attachment(
    attachment_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> Response:
    await fieldwork_service.delete_attachment(db, m, attachment_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
