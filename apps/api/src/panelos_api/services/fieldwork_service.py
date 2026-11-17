"""Field work on panels: issues, maintenance records/plans and attachments."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select, text

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import Conflict, Forbidden, NotFound, ValidationFailed
from panelos_api.core.rbac import Permission
from panelos_api.db.models.attachment import Attachment
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.issue import OPEN_STATUSES, Issue, IssueStatus
from panelos_api.db.models.maintenance import MaintenancePlan, MaintenanceRecord
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.pdf_file import PdfFile
from panelos_api.services import notification_service, panel_access

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.deps import CurrentMembership

# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------


async def attach_files(
    session: AsyncSession,
    m: CurrentMembership,
    *,
    panel: Panel,
    file_ids: list[uuid.UUID],
    issue_id: uuid.UUID | None = None,
    maintenance_id: uuid.UUID | None = None,
    caption: str | None = None,
) -> list[Attachment]:
    """Link uploaded files (owned by the company) to a panel/issue/maintenance record."""

    if not file_ids:
        return []
    owned = set(
        (
            await session.execute(
                select(PdfFile.id).where(
                    PdfFile.id.in_(file_ids), PdfFile.company_id == m.company_id
                )
            )
        )
        .scalars()
        .all()
    )
    if owned != set(file_ids):
        raise NotFound("file not found")
    rows = [
        Attachment(
            company_id=m.company_id,
            panel_id=panel.id,
            issue_id=issue_id,
            maintenance_id=maintenance_id,
            file_id=fid,
            caption=caption,
            uploaded_by=m.user.id,
        )
        for fid in dict.fromkeys(file_ids)
    ]
    session.add_all(rows)
    await session.flush()
    await append_audit(
        session,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.ATTACHMENT_ADDED,
        target_type="panel",
        target_id=str(panel.id),
        meta={"count": len(rows), "issue_id": str(issue_id) if issue_id else None},
    )
    return rows


async def delete_attachment(
    session: AsyncSession, m: CurrentMembership, attachment_id: uuid.UUID
) -> None:
    att = (
        await session.execute(
            select(Attachment).where(
                Attachment.id == attachment_id, Attachment.company_id == m.company_id
            )
        )
    ).scalar_one_or_none()
    if att is None:
        raise NotFound("attachment not found")
    if att.uploaded_by != m.user.id and not m.can(Permission.MANAGE_ISSUES):
        raise Forbidden("only the uploader or a manager can remove this attachment")
    await session.delete(att)
    await append_audit(
        session,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.ATTACHMENT_REMOVED,
        target_type="panel",
        target_id=str(att.panel_id),
        meta={"attachment_id": str(att.id)},
    )
    await session.flush()


# ---------------------------------------------------------------------------
# Issues
# ---------------------------------------------------------------------------


async def get_issue(session: AsyncSession, m: CurrentMembership, issue_id: uuid.UUID) -> Issue:
    issue = (
        await session.execute(
            select(Issue).where(Issue.id == issue_id, Issue.company_id == m.company_id)
        )
    ).scalar_one_or_none()
    if issue is None:
        raise NotFound("issue not found")
    await panel_access.get_panel(session, m, issue.panel_id)  # location visibility
    return issue


async def create_issue(
    session: AsyncSession,
    m: CurrentMembership,
    *,
    panel_id: uuid.UUID,
    title: str,
    description: str | None,
    severity: str,
    file_ids: list[uuid.UUID],
) -> Issue:
    panel = await panel_access.get_panel(session, m, panel_id)
    # Per-company running number; serialize allocators.
    await session.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:k, 0))"),
        {"k": f"issue-number:{m.company_id}"},
    )
    last = (
        await session.execute(
            select(func.max(Issue.number)).where(Issue.company_id == m.company_id)
        )
    ).scalar_one()
    issue = Issue(
        company_id=m.company_id,
        panel_id=panel.id,
        number=int(last or 0) + 1,
        title=title.strip(),
        description=(description or "").strip() or None,
        severity=severity,
        status=IssueStatus.OPEN.value,
        reported_by=m.user.id,
    )
    session.add(issue)
    await session.flush()
    await attach_files(session, m, panel=panel, file_ids=file_ids, issue_id=issue.id)
    await append_audit(
        session,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.ISSUE_CREATED,
        target_type="issue",
        target_id=str(issue.id),
        meta={"panel_id": str(panel.id), "number": issue.number, "severity": severity},
    )
    await notification_service.notify(
        session,
        company_id=m.company_id,
        user_ids=await notification_service.members_with(
            session, m.company_id, Permission.MANAGE_ISSUES
        ),
        kind="issue_reported",
        params=_issue_params(issue, panel, m.user.name),
        link=f"/issues/{issue.id}",
        exclude=m.user.id,
    )
    return issue


def _issue_params(issue: Issue, panel: Panel, actor: str) -> dict[str, Any]:
    return {
        "tag": panel.tag,
        "panel": panel.name,
        "title": issue.title,
        "severity": issue.severity,
        "actor": actor,
    }


async def update_issue(
    session: AsyncSession, m: CurrentMembership, issue_id: uuid.UUID, changes: dict[str, Any]
) -> Issue:
    issue = await get_issue(session, m, issue_id)
    panel = await session.get(Panel, issue.panel_id)
    assert panel is not None
    manager = m.can(Permission.MANAGE_ISSUES)
    is_reporter = issue.reported_by == m.user.id
    is_assignee = issue.assigned_to == m.user.id
    if not (manager or is_reporter or is_assignee):
        raise Forbidden("you cannot change this issue")

    applied: dict[str, Any] = {}

    if "title" in changes or "description" in changes:
        if not (manager or (is_reporter and issue.status == IssueStatus.OPEN.value)):
            raise Forbidden("only the reporter (while open) or a manager can edit the report")
        if changes.get("title") is not None:
            issue.title = changes["title"].strip()
            applied["title"] = issue.title
        if "description" in changes:
            issue.description = (changes["description"] or "").strip() or None
            applied["description"] = True

    if changes.get("severity") is not None and changes["severity"] != issue.severity:
        if not manager:
            raise Forbidden("only a manager can change severity")
        issue.severity = changes["severity"]
        applied["severity"] = issue.severity

    if "assigned_to" in changes and changes["assigned_to"] != issue.assigned_to:
        if not manager:
            raise Forbidden("only a manager can assign issues")
        assignee = changes["assigned_to"]
        if assignee is not None:
            member = (
                await session.execute(
                    select(Membership.id).where(
                        Membership.company_id == m.company_id,
                        Membership.user_id == assignee,
                        Membership.status == "active",
                    )
                )
            ).scalar_one_or_none()
            if member is None:
                raise NotFound("assignee is not an active member")
        issue.assigned_to = assignee
        applied["assigned_to"] = str(assignee) if assignee else None
        if assignee is not None:
            if issue.status == IssueStatus.OPEN.value:
                issue.status = IssueStatus.IN_PROGRESS.value
            await notification_service.notify(
                session,
                company_id=m.company_id,
                user_ids=[assignee],
                kind="issue_assigned",
                params=_issue_params(issue, panel, m.user.name),
                link=f"/issues/{issue.id}",
                exclude=m.user.id,
            )

    if "resolution_note" in changes:
        issue.resolution_note = (changes["resolution_note"] or "").strip() or None
        applied["resolution_note"] = True

    new_status = changes.get("status")
    if new_status is not None and new_status != issue.status:
        if new_status == IssueStatus.CLOSED.value and not manager:
            raise Forbidden("only a manager can close an issue")
        if new_status in OPEN_STATUSES and issue.status not in OPEN_STATUSES and not manager:
            raise Forbidden("only a manager can reopen an issue")
        old = issue.status
        issue.status = new_status
        if new_status in (IssueStatus.RESOLVED.value, IssueStatus.CLOSED.value):
            if issue.resolved_at is None:
                issue.resolved_at = datetime.now(UTC)
                issue.resolved_by = m.user.id
            if new_status == IssueStatus.RESOLVED.value:
                await notification_service.notify(
                    session,
                    company_id=m.company_id,
                    user_ids=[issue.reported_by, issue.assigned_to],
                    kind="issue_resolved",
                    params=_issue_params(issue, panel, m.user.name),
                    link=f"/issues/{issue.id}",
                    exclude=m.user.id,
                )
        else:  # reopened
            issue.resolved_at = None
            issue.resolved_by = None
        await append_audit(
            session,
            company_id=m.company_id,
            actor_id=m.user.id,
            action=AuditAction.ISSUE_STATUS_CHANGED,
            target_type="issue",
            target_id=str(issue.id),
            meta={"from": old, "to": new_status},
        )

    if applied:
        await append_audit(
            session,
            company_id=m.company_id,
            actor_id=m.user.id,
            action=AuditAction.ISSUE_UPDATED,
            target_type="issue",
            target_id=str(issue.id),
            meta={"changes": applied},
        )
    await session.flush()
    return issue


# ---------------------------------------------------------------------------
# Maintenance
# ---------------------------------------------------------------------------


async def record_maintenance(
    session: AsyncSession,
    m: CurrentMembership,
    *,
    panel_id: uuid.UUID,
    data: dict[str, Any],
) -> MaintenanceRecord:
    panel = await panel_access.get_panel(session, m, panel_id)
    performed_at: datetime = data.get("performed_at") or datetime.now(UTC)
    if performed_at.tzinfo is None:
        performed_at = performed_at.replace(tzinfo=UTC)
    if performed_at > datetime.now(UTC) + timedelta(hours=1):
        raise ValidationFailed("performed_at cannot be in the future", code="date_in_future")

    plan: MaintenancePlan | None = None
    if data.get("plan_id"):
        plan = (
            await session.execute(
                select(MaintenancePlan).where(
                    MaintenancePlan.id == data["plan_id"],
                    MaintenancePlan.company_id == m.company_id,
                    MaintenancePlan.panel_id == panel.id,
                )
            )
        ).scalar_one_or_none()
        if plan is None:
            raise NotFound("maintenance plan not found")

    issue: Issue | None = None
    if data.get("issue_id"):
        issue = (
            await session.execute(
                select(Issue).where(
                    Issue.id == data["issue_id"],
                    Issue.company_id == m.company_id,
                    Issue.panel_id == panel.id,
                )
            )
        ).scalar_one_or_none()
        if issue is None:
            raise NotFound("issue not found")

    by_name = (data.get("performed_by_name") or "").strip() or None
    rec = MaintenanceRecord(
        company_id=m.company_id,
        panel_id=panel.id,
        plan_id=plan.id if plan else None,
        issue_id=issue.id if issue else None,
        kind=data.get("kind") or (plan.kind if plan else "inspection"),
        result=data.get("result") or "ok",
        summary=data["summary"].strip(),
        findings=(data.get("findings") or "").strip() or None,
        performed_at=performed_at,
        performed_by=None if by_name else m.user.id,
        performed_by_name=by_name,
    )
    session.add(rec)
    await session.flush()
    await attach_files(
        session, m, panel=panel, file_ids=data.get("file_ids") or [], maintenance_id=rec.id
    )

    if plan is not None:
        # The next cycle starts from the day the work was actually done.
        plan.next_due_on = performed_at.date() + timedelta(days=plan.interval_days)
        plan.notified_for = None

    await append_audit(
        session,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.MAINTENANCE_RECORDED,
        target_type="panel",
        target_id=str(panel.id),
        meta={"record_id": str(rec.id), "kind": rec.kind, "result": rec.result},
    )
    if issue is not None and data.get("resolve_issue") and issue.status in OPEN_STATUSES:
        await update_issue(
            session,
            m,
            issue.id,
            {"status": IssueStatus.RESOLVED.value, "resolution_note": rec.summary},
        )
    await session.flush()
    return rec


async def get_plan(
    session: AsyncSession, m: CurrentMembership, plan_id: uuid.UUID
) -> MaintenancePlan:
    plan = (
        await session.execute(
            select(MaintenancePlan).where(
                MaintenancePlan.id == plan_id, MaintenancePlan.company_id == m.company_id
            )
        )
    ).scalar_one_or_none()
    if plan is None:
        raise NotFound("maintenance plan not found")
    await panel_access.get_panel(session, m, plan.panel_id)
    return plan


async def create_plan(
    session: AsyncSession, m: CurrentMembership, *, panel_id: uuid.UUID, data: dict[str, Any]
) -> MaintenancePlan:
    panel = await panel_access.get_panel(session, m, panel_id)
    plan = MaintenancePlan(company_id=m.company_id, panel_id=panel.id, **data)
    session.add(plan)
    await session.flush()
    await append_audit(
        session,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.MAINTENANCE_PLAN_CREATED,
        target_type="panel",
        target_id=str(panel.id),
        meta={"plan_id": str(plan.id), "title": plan.title, "interval_days": plan.interval_days},
    )
    return plan


async def update_plan(
    session: AsyncSession, m: CurrentMembership, plan_id: uuid.UUID, changes: dict[str, Any]
) -> MaintenancePlan:
    plan = await get_plan(session, m, plan_id)
    for key, value in changes.items():
        if value is None and key != "notes":
            continue
        setattr(plan, key, value)
    if "next_due_on" in changes:
        plan.notified_for = None
    await append_audit(
        session,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.MAINTENANCE_PLAN_UPDATED,
        target_type="panel",
        target_id=str(plan.panel_id),
        meta={"plan_id": str(plan.id), "changes": sorted(changes)},
    )
    await session.flush()
    return plan


async def delete_plan(session: AsyncSession, m: CurrentMembership, plan_id: uuid.UUID) -> None:
    plan = await get_plan(session, m, plan_id)
    used = (
        await session.execute(
            select(func.count())
            .select_from(MaintenanceRecord)
            .where(MaintenanceRecord.plan_id == plan.id)
        )
    ).scalar_one()
    if used:
        # Keep history intact: retire the plan instead of deleting it.
        raise Conflict(
            "this plan has maintenance history; deactivate it instead", code="plan_in_use"
        )
    await session.delete(plan)
    await append_audit(
        session,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.MAINTENANCE_PLAN_DELETED,
        target_type="panel",
        target_id=str(plan.panel_id),
        meta={"plan_id": str(plan.id), "title": plan.title},
    )
    await session.flush()


DUE_SOON_DAYS = 7


async def announce_due_plans(session: AsyncSession, *, today: date | None = None) -> int:
    """Notify maintainers about plans that are due within a week (once per cycle).

    Runs from the background scheduler with an owner session (all companies).
    """

    today = today or datetime.now(UTC).date()
    horizon = today + timedelta(days=DUE_SOON_DAYS)
    rows = (
        await session.execute(
            select(MaintenancePlan, Panel)
            .join(Panel, Panel.id == MaintenancePlan.panel_id)
            .where(
                MaintenancePlan.active.is_(True),
                MaintenancePlan.next_due_on <= horizon,
                Panel.archived_at.is_(None),
                (MaintenancePlan.notified_for.is_(None))
                | (MaintenancePlan.notified_for != MaintenancePlan.next_due_on),
            )
            .with_for_update(of=MaintenancePlan, skip_locked=True)
        )
    ).all()
    for plan, panel in rows:
        await notification_service.notify(
            session,
            company_id=plan.company_id,
            user_ids=await notification_service.members_with(
                session, plan.company_id, Permission.MANAGE_MAINTENANCE
            ),
            kind="maintenance_due",
            params={
                "tag": panel.tag,
                "panel": panel.name,
                "title": plan.title,
                "due": plan.next_due_on.isoformat(),
            },
            link=f"/panels/{panel.id}?tab=maintenance",
        )
        plan.notified_for = plan.next_due_on
    await session.flush()
    return len(rows)
