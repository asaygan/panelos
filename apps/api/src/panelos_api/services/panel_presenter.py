"""Build ``PanelOut`` rows with their derived state in a fixed number of queries.

Every list (table, tree, search, dashboard) needs the same per-panel facts:
where it is, which revision is live, whether something is pending, open
issues, last scan, next maintenance. Doing that per row would be N+1; here it
is one query per fact for the whole batch.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select

from panelos_api.api.v1.schemas.panel import PanelOut, RevisionRef
from panelos_api.db.models.cabinet import Cabinet
from panelos_api.db.models.issue import OPEN_STATUSES, Issue
from panelos_api.db.models.location import Location
from panelos_api.db.models.maintenance import MaintenancePlan
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.db.models.project import Project
from panelos_api.db.models.scan_event import ScanEvent
from panelos_api.db.models.system_group import SystemGroup

if TYPE_CHECKING:
    import uuid
    from collections.abc import Sequence

    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.db.models.panel import Panel

_SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}


async def present_panels(session: AsyncSession, panels: Sequence[Panel]) -> list[PanelOut]:
    """``PanelOut`` rows for ``panels``, in order."""

    return await present_as(session, panels, PanelOut)


async def present_as[TOut: PanelOut](
    session: AsyncSession, panels: Sequence[Panel], schema: type[TOut]
) -> list[TOut]:
    """Like :func:`present_panels` but building a ``PanelOut`` subclass (tree nodes)."""

    if not panels:
        return []
    ids = [p.id for p in panels]
    today = datetime.now(UTC).date()

    loc_ids = {p.location_id for p in panels if p.location_id}
    locations: dict[uuid.UUID, str] = {}
    if loc_ids:
        locations = dict(
            (
                await session.execute(
                    select(Location.id, Location.name).where(Location.id.in_(loc_ids))
                )
            ).all()
        )

    group_ids = {p.system_group_id for p in panels if p.system_group_id}
    groups: dict[uuid.UUID, Any] = {}
    if group_ids:
        groups = {
            row.id: row
            for row in (
                await session.execute(
                    select(
                        SystemGroup.id,
                        SystemGroup.name,
                        SystemGroup.project_id,
                        Project.name.label("project_name"),
                    )
                    .join(Project, Project.id == SystemGroup.project_id)
                    .where(SystemGroup.id.in_(group_ids))
                )
            ).all()
        }

    # Live (approved) revision + the newest open one (draft / in review).
    active_ids = {p.active_revision_id for p in panels if p.active_revision_id}
    active: dict[uuid.UUID, Any] = {}
    if active_ids:
        active = {
            row.id: row
            for row in (
                await session.execute(
                    select(
                        PanelRevision.id, PanelRevision.revision_letter, PanelRevision.status
                    ).where(PanelRevision.id.in_(active_ids))
                )
            ).all()
        }
    pending: dict[uuid.UUID, Any] = {}
    for row in (
        await session.execute(
            select(
                PanelRevision.id,
                PanelRevision.panel_id,
                PanelRevision.revision_letter,
                PanelRevision.status,
            )
            .where(
                PanelRevision.panel_id.in_(ids),
                PanelRevision.status.in_([RevisionStatus.DRAFT, RevisionStatus.REVIEW]),
            )
            .order_by(PanelRevision.revision_number.asc())
        )
    ).all():
        pending[row.panel_id] = row  # last one wins = highest revision number

    issues: dict[uuid.UUID, tuple[int, str | None]] = {}
    for panel_id, severity, count in (
        await session.execute(
            select(Issue.panel_id, Issue.severity, func.count())
            .where(Issue.panel_id.in_(ids), Issue.status.in_(OPEN_STATUSES))
            .group_by(Issue.panel_id, Issue.severity)
        )
    ).all():
        total, worst = issues.get(panel_id, (0, None))
        if worst is None or _SEVERITY_RANK.get(severity, 0) > _SEVERITY_RANK.get(worst, 0):
            worst = severity
        issues[panel_id] = (total + int(count), worst)

    scans = dict(
        (
            await session.execute(
                select(ScanEvent.panel_id, func.max(ScanEvent.at))
                .where(ScanEvent.panel_id.in_(ids))
                .group_by(ScanEvent.panel_id)
            )
        ).all()
    )
    due = dict(
        (
            await session.execute(
                select(MaintenancePlan.panel_id, func.min(MaintenancePlan.next_due_on))
                .where(MaintenancePlan.panel_id.in_(ids), MaintenancePlan.active.is_(True))
                .group_by(MaintenancePlan.panel_id)
            )
        ).all()
    )
    cabinets = dict(
        (
            await session.execute(
                select(Cabinet.panel_id, func.count())
                .where(Cabinet.panel_id.in_(ids))
                .group_by(Cabinet.panel_id)
            )
        ).all()
    )

    out: list[TOut] = []
    for p in panels:
        o = schema.model_validate(p)
        o.location_name = locations.get(p.location_id) if p.location_id else None
        g = groups.get(p.system_group_id) if p.system_group_id else None
        if g is not None:
            o.group_name, o.project_id, o.project_name = g.name, g.project_id, g.project_name
        a = active.get(p.active_revision_id) if p.active_revision_id else None
        if a is not None and a.status == RevisionStatus.APPROVED:
            o.active_revision = RevisionRef(id=a.id, letter=a.revision_letter, status="approved")
        pr = pending.get(p.id)
        if pr is not None:
            o.pending_revision = RevisionRef(
                id=pr.id, letter=pr.revision_letter, status=pr.status.value
            )
        if o.active_revision is not None:
            o.doc_status = "approved"
        elif pr is not None:
            o.doc_status = "in_review" if pr.status == RevisionStatus.REVIEW else "draft"
        o.open_issue_count, o.worst_open_severity = issues.get(p.id, (0, None))
        o.last_scan_at = scans.get(p.id)
        o.next_maintenance_on = due.get(p.id)
        o.maintenance_overdue = bool(o.next_maintenance_on and o.next_maintenance_on < today)
        o.cabinet_count = int(cabinets.get(p.id, 0))
        out.append(o)
    return out


async def present_panel(session: AsyncSession, panel: Panel) -> PanelOut:
    return (await present_panels(session, [panel]))[0]
