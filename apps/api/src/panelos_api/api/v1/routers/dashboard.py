"""Dashboard: every number here is computed from live data (nothing mocked)."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import TYPE_CHECKING, Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import Date, cast, func, select

from panelos_api.db.models.audit_log import AuditLog
from panelos_api.db.models.cabinet import Cabinet
from panelos_api.db.models.issue import OPEN_STATUSES, Issue
from panelos_api.db.models.location import Location
from panelos_api.db.models.maintenance import MaintenancePlan, MaintenanceRecord
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.db.models.project import Project
from panelos_api.db.models.scan_event import ScanEvent
from panelos_api.db.models.system_group import SystemGroup
from panelos_api.db.models.user import User
from panelos_api.deps import CurrentMembership, get_current_membership, get_db
from panelos_api.services import panel_access
from panelos_api.services.fieldwork_service import DUE_SOON_DAYS

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DayCount(BaseModel):
    day: date
    count: int


class AttentionItem(BaseModel):
    kind: str  # issue | maintenance_overdue | review | no_approved_revision
    panel_id: uuid.UUID
    tag: str
    name: str
    title: str | None = None
    severity: str | None = None
    due_on: date | None = None
    ref_id: uuid.UUID | None = None
    at: datetime | None = None


class LocationStat(BaseModel):
    location_id: uuid.UUID | None
    name: str | None
    panels: int
    open_issues: int


class ActivityItem(BaseModel):
    id: uuid.UUID
    at: datetime
    action: str
    actor_name: str | None = None
    target_type: str
    target_id: str
    meta: dict[str, Any] = Field(default_factory=dict)


class DashboardOut(BaseModel):
    counts: dict[str, int]
    revisions: dict[str, int]
    issues: dict[str, int]
    maintenance: dict[str, int]
    documentation: dict[str, int]
    scans: dict[str, int]
    scan_series: list[DayCount]
    issue_series: list[DayCount]
    attention: list[AttentionItem]
    by_location: list[LocationStat]
    recent_activity: list[ActivityItem]


def _fill(rows: dict[date, int], start: date, days: int) -> list[DayCount]:
    return [
        DayCount(day=start + timedelta(days=i), count=int(rows.get(start + timedelta(days=i), 0)))
        for i in range(days)
    ]


@router.get("", response_model=DashboardOut)
async def dashboard(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> DashboardOut:
    cid = m.company_id
    allowed = await panel_access.allowed_location_ids(db, m)
    now = datetime.now(UTC)
    today = now.date()
    d30 = now - timedelta(days=30)
    d7 = now - timedelta(days=7)
    series_start = today - timedelta(days=29)

    def panels_q(*cols: Any) -> Any:
        stmt = (
            select(*cols)
            .select_from(Panel)
            .where(Panel.company_id == cid, Panel.archived_at.is_(None))
        )
        return panel_access.restrict_panels(stmt, allowed)

    async def scalar(stmt: Any) -> int:
        return int((await db.execute(stmt)).scalar_one() or 0)

    visible_panels = panels_q(Panel.id).subquery()

    counts = {
        "projects": await scalar(
            select(func.count())
            .select_from(Project)
            .where(Project.company_id == cid, Project.archived_at.is_(None))
        ),
        "system_groups": await scalar(
            select(func.count())
            .select_from(SystemGroup)
            .join(Project, Project.id == SystemGroup.project_id)
            .where(SystemGroup.company_id == cid, Project.archived_at.is_(None))
        ),
        "panels": await scalar(select(func.count()).select_from(visible_panels)),
        "cabinets": await scalar(
            select(func.count())
            .select_from(Cabinet)
            .where(Cabinet.panel_id.in_(select(visible_panels.c.id)))
        ),
        "locations": await scalar(
            select(func.count()).select_from(Location).where(Location.company_id == cid)
        ),
        "members": await scalar(
            select(func.count())
            .select_from(Membership)
            .where(Membership.company_id == cid, Membership.status == "active")
        ),
    }

    rev_rows = (
        await db.execute(
            select(PanelRevision.status, func.count())
            .where(PanelRevision.panel_id.in_(select(visible_panels.c.id)))
            .group_by(PanelRevision.status)
        )
    ).all()
    by_status = {status.value: int(n) for status, n in rev_rows}
    revisions = {
        "draft": by_status.get("draft", 0),
        "review": by_status.get("review", 0),
        "approved_30d": await scalar(
            select(func.count())
            .select_from(PanelRevision)
            .where(
                PanelRevision.panel_id.in_(select(visible_panels.c.id)),
                PanelRevision.approved_at >= d30,
            )
        ),
    }

    issue_rows = (
        await db.execute(
            select(Issue.severity, func.count())
            .where(
                Issue.company_id == cid,
                Issue.status.in_(OPEN_STATUSES),
                Issue.panel_id.in_(select(visible_panels.c.id)),
            )
            .group_by(Issue.severity)
        )
    ).all()
    sev = {s: int(n) for s, n in issue_rows}
    issues = {
        "open": sum(sev.values()),
        "critical": sev.get("critical", 0),
        "high": sev.get("high", 0),
        "medium": sev.get("medium", 0),
        "low": sev.get("low", 0),
        "resolved_30d": await scalar(
            select(func.count())
            .select_from(Issue)
            .where(
                Issue.company_id == cid,
                Issue.resolved_at >= d30,
                Issue.panel_id.in_(select(visible_panels.c.id)),
            )
        ),
    }

    plan_base = (
        select(func.count())
        .select_from(MaintenancePlan)
        .where(
            MaintenancePlan.company_id == cid,
            MaintenancePlan.active.is_(True),
            MaintenancePlan.panel_id.in_(select(visible_panels.c.id)),
        )
    )
    maintenance = {
        "overdue": await scalar(plan_base.where(MaintenancePlan.next_due_on < today)),
        "due_soon": await scalar(
            plan_base.where(
                MaintenancePlan.next_due_on >= today,
                MaintenancePlan.next_due_on <= today + timedelta(days=DUE_SOON_DAYS),
            )
        ),
        "plans": await scalar(plan_base),
        "done_30d": await scalar(
            select(func.count())
            .select_from(MaintenanceRecord)
            .where(
                MaintenanceRecord.company_id == cid,
                MaintenanceRecord.performed_at >= d30,
                MaintenanceRecord.panel_id.in_(select(visible_panels.c.id)),
            )
        ),
    }

    approved = await scalar(
        panels_q(func.count())
        .join(PanelRevision, PanelRevision.id == Panel.active_revision_id)
        .where(PanelRevision.status == RevisionStatus.APPROVED)
    )
    documentation = {"approved": approved, "missing": max(counts["panels"] - approved, 0)}

    scan_scope = ScanEvent.panel_id.in_(select(visible_panels.c.id))
    scans = {
        "last_7d": await scalar(
            select(func.count()).select_from(ScanEvent).where(scan_scope, ScanEvent.at >= d7)
        ),
        "last_30d": await scalar(
            select(func.count()).select_from(ScanEvent).where(scan_scope, ScanEvent.at >= d30)
        ),
        "today": await scalar(
            select(func.count())
            .select_from(ScanEvent)
            .where(scan_scope, cast(ScanEvent.at, Date) == today)
        ),
    }
    scan_days = dict(
        (
            await db.execute(
                select(cast(ScanEvent.at, Date), func.count())
                .where(scan_scope, cast(ScanEvent.at, Date) >= series_start)
                .group_by(cast(ScanEvent.at, Date))
            )
        ).all()
    )
    issue_days = dict(
        (
            await db.execute(
                select(cast(Issue.created_at, Date), func.count())
                .where(
                    Issue.company_id == cid,
                    Issue.panel_id.in_(select(visible_panels.c.id)),
                    cast(Issue.created_at, Date) >= series_start,
                )
                .group_by(cast(Issue.created_at, Date))
            )
        ).all()
    )

    # ---- what needs attention, most urgent first
    attention: list[AttentionItem] = []
    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    open_issues = (
        await db.execute(
            select(Issue, Panel.tag, Panel.name)
            .join(Panel, Panel.id == Issue.panel_id)
            .where(
                Issue.company_id == cid,
                Issue.status.in_(OPEN_STATUSES),
                Issue.panel_id.in_(select(visible_panels.c.id)),
            )
            .order_by(Issue.created_at.desc())
            .limit(50)
        )
    ).all()
    for issue, tag, name in sorted(open_issues, key=lambda r: severity_rank.get(r[0].severity, 9))[
        :6
    ]:
        attention.append(
            AttentionItem(
                kind="issue",
                panel_id=issue.panel_id,
                tag=tag,
                name=name,
                title=issue.title,
                severity=issue.severity,
                ref_id=issue.id,
                at=issue.created_at,
            )
        )
    overdue = (
        await db.execute(
            select(MaintenancePlan, Panel.tag, Panel.name)
            .join(Panel, Panel.id == MaintenancePlan.panel_id)
            .where(
                MaintenancePlan.company_id == cid,
                MaintenancePlan.active.is_(True),
                MaintenancePlan.next_due_on < today,
                MaintenancePlan.panel_id.in_(select(visible_panels.c.id)),
            )
            .order_by(MaintenancePlan.next_due_on.asc())
            .limit(5)
        )
    ).all()
    for plan, tag, name in overdue:
        attention.append(
            AttentionItem(
                kind="maintenance_overdue",
                panel_id=plan.panel_id,
                tag=tag,
                name=name,
                title=plan.title,
                due_on=plan.next_due_on,
                ref_id=plan.id,
            )
        )
    in_review = (
        await db.execute(
            select(PanelRevision, Panel.tag, Panel.name)
            .join(Panel, Panel.id == PanelRevision.panel_id)
            .where(
                PanelRevision.status == RevisionStatus.REVIEW,
                PanelRevision.panel_id.in_(select(visible_panels.c.id)),
            )
            .order_by(PanelRevision.submitted_at.asc())
            .limit(5)
        )
    ).all()
    for rev, tag, name in in_review:
        attention.append(
            AttentionItem(
                kind="review",
                panel_id=rev.panel_id,
                tag=tag,
                name=name,
                title=f"Rev {rev.revision_letter}",
                ref_id=rev.id,
                at=rev.submitted_at,
            )
        )

    # ---- fleet by location
    loc_rows = (
        await db.execute(panels_q(Panel.location_id, func.count()).group_by(Panel.location_id))
    ).all()
    loc_issue_rows = dict(
        (
            await db.execute(
                panels_q(Panel.location_id, func.count())
                .join(Issue, Issue.panel_id == Panel.id)
                .where(Issue.status.in_(OPEN_STATUSES))
                .group_by(Panel.location_id)
            )
        ).all()
    )
    loc_names = dict(
        (
            await db.execute(select(Location.id, Location.name).where(Location.company_id == cid))
        ).all()
    )
    by_location = sorted(
        (
            LocationStat(
                location_id=loc_id,
                name=loc_names.get(loc_id) if loc_id else None,
                panels=int(n),
                open_issues=int(loc_issue_rows.get(loc_id, 0)),
            )
            for loc_id, n in loc_rows
        ),
        key=lambda s: -s.panels,
    )

    # ---- recent activity (audit trail, newest first)
    activity_rows = (
        await db.execute(
            select(AuditLog, User.name)
            .outerjoin(User, User.id == AuditLog.actor_id)
            .where(
                AuditLog.company_id == cid, AuditLog.action.notin_(["auth.login", "auth.logout"])
            )
            .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
            .limit(15)
        )
    ).all()
    recent = [
        ActivityItem(
            id=log.id,
            at=log.created_at,
            action=log.action.value,
            actor_name=actor,
            target_type=log.target_type,
            target_id=log.target_id,
            meta=log.meta or {},
        )
        for log, actor in activity_rows
    ]

    return DashboardOut(
        counts=counts,
        revisions=revisions,
        issues=issues,
        maintenance=maintenance,
        documentation=documentation,
        scans=scans,
        scan_series=_fill(scan_days, series_start, 30),
        issue_series=_fill(issue_days, series_start, 30),
        attention=attention,
        by_location=by_location,
        recent_activity=recent,
    )
