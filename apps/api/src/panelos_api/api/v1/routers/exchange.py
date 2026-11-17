"""Bulk import + export endpoints (CSV / Excel)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any, Literal

from fastapi import APIRouter, Depends, File, Query, Response, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select

from panelos_api.config import Settings, get_settings
from panelos_api.core.audit import append_audit
from panelos_api.core.rbac import Permission
from panelos_api.db.models.audit_log import AuditAction, AuditLog
from panelos_api.db.models.component import Component
from panelos_api.db.models.issue import Issue
from panelos_api.db.models.maintenance import MaintenanceRecord
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.user import User
from panelos_api.deps import CurrentMembership, get_db, require_permission
from panelos_api.services import exchange_service as xs
from panelos_api.services import panel_access
from panelos_api.services.panel_presenter import present_panels

if TYPE_CHECKING:
    from collections.abc import Sequence

    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["import-export"])

Format = Literal["csv", "xlsx"]


def _download(
    name: str, fmt: Format, headers: Sequence[str], rows: list[Sequence[Any]]
) -> Response:
    if fmt == "xlsx":
        body, media = xs.to_xlsx(headers, rows, sheet=name), xs.XLSX_MIME
    else:
        body, media = xs.to_csv(headers, rows), "text/csv; charset=utf-8"
    filename = f"panelos-{name}-{xs.export_stamp()}.{fmt}"
    return Response(
        content=body,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _log_export(db: AsyncSession, m: CurrentMembership, what: str, rows: int) -> None:
    await append_audit(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.DATA_EXPORTED,
        target_type="company",
        target_id=str(m.company_id),
        meta={"dataset": what, "rows": rows},
    )


PANEL_EXPORT_HEADERS = [
    "project", "system_group", "tag", "name", "serial", "location_code", "area", "voltage",
    "current_a", "phase", "mfr", "customer", "enclosure", "ip_class", "notes", "revision",
    "doc_status", "open_issues", "next_maintenance", "last_scan", "qr_url",
]  # fmt: skip


@router.get("/export/panels")
async def export_panels(
    fmt: Format = Query(default="xlsx", alias="format"),
    m: CurrentMembership = Depends(require_permission(Permission.EXPORT_DATA)),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Response:
    from panelos_api.db.models.location import Location

    stmt = panel_access.restrict_panels(
        select(Panel).where(Panel.company_id == m.company_id, Panel.archived_at.is_(None)),
        await panel_access.allowed_location_ids(db, m),
    ).order_by(Panel.tag)
    panels = list((await db.execute(stmt)).scalars().all())
    codes = dict(
        (
            await db.execute(
                select(Location.id, Location.code).where(Location.company_id == m.company_id)
            )
        ).all()
    )
    base = settings.APP_URL.rstrip("/")
    rows = [
        [
            p.project_name, p.group_name, p.tag, p.name, p.serial,
            codes.get(p.location_id) if p.location_id else None, p.area, p.voltage,
            p.current_a, p.phase, p.mfr, p.customer, p.enclosure, p.ip_class, p.notes,
            p.active_revision.letter if p.active_revision else None, p.doc_status,
            p.open_issue_count,
            p.next_maintenance_on.isoformat() if p.next_maintenance_on else None,
            p.last_scan_at.isoformat(timespec="minutes") if p.last_scan_at else None,
            f"{base}/q/{p.qr_token}",
        ]
        for p in await present_panels(db, panels)
    ]  # fmt: skip
    await _log_export(db, m, "panels", len(rows))
    return _download("panels", fmt, PANEL_EXPORT_HEADERS, rows)


@router.get("/import/panels/template")
async def panel_import_template(
    fmt: Format = Query(default="xlsx", alias="format"),
    m: CurrentMembership = Depends(require_permission(Permission.EXPORT_DATA)),
) -> Response:
    headers = list(xs.PANEL_COLUMNS)
    example = [
        "Plant A", "MCC", "MCC-01", "Motor Control Center 1", "SN-0001", "", "Hall 2",
        "400 V", "630 A", "3P+N", "", "", "Form 4b", "IP54", "",
    ]  # fmt: skip
    if fmt == "xlsx":
        body, media = xs.to_xlsx(headers, [example], sheet="Panels"), xs.XLSX_MIME
    else:
        body, media = xs.to_csv(headers, [example]), "text/csv; charset=utf-8"
    return Response(
        content=body,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="panelos-panels-template.{fmt}"'},
    )


class ImportRowOut(BaseModel):
    row: int
    action: str
    tag: str = ""
    name: str = ""
    serial: str = ""
    errors: list[str] = Field(default_factory=list)


class ImportResultOut(BaseModel):
    committed: bool
    created: int
    updated: int
    failed: int
    unknown_columns: list[str] = Field(default_factory=list)
    rows: list[ImportRowOut]


@router.post("/import/panels", response_model=ImportResultOut)
async def import_panels(
    file: UploadFile = File(...),
    dry_run: bool = Query(default=True, description="Validate only; write nothing"),
    m: CurrentMembership = Depends(require_permission(Permission.EXPORT_DATA)),
    db: AsyncSession = Depends(get_db),
) -> ImportResultOut:
    """Validate (default) or apply a panel sheet. Nothing is written if any row is invalid."""
    if not m.can(Permission.CRUD_PANELS):
        from panelos_api.core.exceptions import Forbidden

        raise Forbidden(f"permission denied: {Permission.CRUD_PANELS.value}")
    raw = await file.read(xs.MAX_IMPORT_BYTES + 1)
    records = xs.read_table(raw, file.filename or "upload.csv")
    result = await xs.import_panels(
        db, company_id=m.company_id, actor_id=m.user.id, records=records, dry_run=dry_run
    )
    return ImportResultOut(
        committed=result.committed,
        created=result.created,
        updated=result.updated,
        failed=result.failed,
        unknown_columns=result.unknown_columns,
        rows=[
            ImportRowOut(
                row=r.row, action=r.action, tag=r.tag, name=r.name, serial=r.serial, errors=r.errors
            )
            for r in result.rows
        ],
    )


@router.get("/export/components")
async def export_components(
    panel_id: uuid.UUID,
    fmt: Format = Query(default="xlsx", alias="format"),
    m: CurrentMembership = Depends(require_permission(Permission.EXPORT_DATA)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Bill of materials of the panel's live (approved) revision."""
    panel = await panel_access.get_panel(db, m, panel_id)
    rows: list[Sequence[Any]] = []
    if panel.active_revision_id:
        comps = (
            (
                await db.execute(
                    select(Component)
                    .where(Component.revision_id == panel.active_revision_id)
                    .order_by(Component.slot)
                )
            )
            .scalars()
            .all()
        )
        rows = [
            [c.slot, c.ref, c.description, c.part_number, c.rating, c.type, c.status] for c in comps
        ]
    await _log_export(db, m, f"components:{panel.tag}", len(rows))
    return _download(
        f"bom-{panel.tag}",
        fmt,
        ["slot", "ref", "description", "part_number", "rating", "type", "status"],
        rows,
    )


@router.get("/export/issues")
async def export_issues(
    fmt: Format = Query(default="xlsx", alias="format"),
    m: CurrentMembership = Depends(require_permission(Permission.EXPORT_DATA)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    stmt = panel_access.restrict_panels(
        select(Issue, Panel.tag, Panel.name)
        .join(Panel, Panel.id == Issue.panel_id)
        .where(Issue.company_id == m.company_id),
        await panel_access.allowed_location_ids(db, m),
    ).order_by(Issue.number)
    data = (await db.execute(stmt)).all()
    names = await _user_names(db, {u for i, _t, _n in data for u in (i.reported_by, i.assigned_to)})
    rows = [
        [
            i.number, tag, name, i.title, i.severity, i.status,
            names.get(i.reported_by), names.get(i.assigned_to),
            i.created_at.isoformat(timespec="minutes"),
            i.resolved_at.isoformat(timespec="minutes") if i.resolved_at else None,
            i.resolution_note,
        ]
        for i, tag, name in data
    ]  # fmt: skip
    await _log_export(db, m, "issues", len(rows))
    return _download(
        "issues",
        fmt,
        ["number", "panel_tag", "panel_name", "title", "severity", "status", "reported_by",
         "assigned_to", "created_at", "resolved_at", "resolution_note"],
        rows,
    )  # fmt: skip


@router.get("/export/maintenance")
async def export_maintenance(
    fmt: Format = Query(default="xlsx", alias="format"),
    m: CurrentMembership = Depends(require_permission(Permission.EXPORT_DATA)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    stmt = panel_access.restrict_panels(
        select(MaintenanceRecord, Panel.tag, Panel.name)
        .join(Panel, Panel.id == MaintenanceRecord.panel_id)
        .where(MaintenanceRecord.company_id == m.company_id),
        await panel_access.allowed_location_ids(db, m),
    ).order_by(MaintenanceRecord.performed_at.desc())
    data = (await db.execute(stmt)).all()
    names = await _user_names(db, {r.performed_by for r, _t, _n in data})
    rows = [
        [
            tag, name, r.performed_at.isoformat(timespec="minutes"), r.kind, r.result,
            r.summary, r.findings, r.performed_by_name or names.get(r.performed_by),
        ]
        for r, tag, name in data
    ]  # fmt: skip
    await _log_export(db, m, "maintenance", len(rows))
    return _download(
        "maintenance",
        fmt,
        ["panel_tag", "panel_name", "performed_at", "kind", "result", "summary", "findings",
         "performed_by"],
        rows,
    )  # fmt: skip


@router.get("/export/audit-logs")
async def export_audit(
    fmt: Format = Query(default="csv", alias="format"),
    limit: int = Query(default=10000, ge=1, le=50000),
    m: CurrentMembership = Depends(require_permission(Permission.VIEW_AUDIT)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    import json

    data = (
        await db.execute(
            select(AuditLog, User.email)
            .outerjoin(User, User.id == AuditLog.actor_id)
            .where(AuditLog.company_id == m.company_id)
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .limit(limit)
        )
    ).all()
    rows = [
        [
            log.created_at.isoformat(timespec="seconds"), email, log.action.value,
            log.target_type, log.target_id, json.dumps(log.meta or {}, ensure_ascii=False),
            log.hash.hex(),
        ]
        for log, email in data
    ]  # fmt: skip
    await _log_export(db, m, "audit-logs", len(rows))
    return _download(
        "audit-log",
        fmt,
        ["at", "actor", "action", "target_type", "target_id", "meta", "hash"],
        rows,
    )


async def _user_names(db: AsyncSession, ids: set[uuid.UUID | None]) -> dict[Any, str]:
    wanted = {i for i in ids if i is not None}
    if not wanted:
        return {}
    return dict((await db.execute(select(User.id, User.name).where(User.id.in_(wanted)))).all())
