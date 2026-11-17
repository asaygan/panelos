"""Global search (command palette): projects, groups, panels, cabinets, components, issues."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import or_, select

from panelos_api.db.models.cabinet import Cabinet
from panelos_api.db.models.component import Component
from panelos_api.db.models.issue import Issue
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.project import Project
from panelos_api.db.models.system_group import SystemGroup

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


def _like(q: str) -> str:
    # Escape LIKE wildcards so "100%" searches for the literal text.
    escaped = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


async def search(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    q: str,
    allowed_locations: set[uuid.UUID] | None = None,
    per_type: int = 6,
) -> list[dict[str, Any]]:
    """Return mixed hits; each has ``type``, ``id``, ``title``, ``subtitle``, ``href``."""

    q = q.strip()
    if len(q) < 2:
        return []
    like = _like(q)
    hits: list[dict[str, Any]] = []

    def panel_scope(stmt: Any) -> Any:
        stmt = stmt.where(Panel.company_id == company_id, Panel.archived_at.is_(None))
        if allowed_locations is not None:
            stmt = stmt.where(Panel.location_id.in_(allowed_locations))
        return stmt

    panels = (
        await session.execute(
            panel_scope(select(Panel))
            .where(
                or_(
                    Panel.tag.ilike(like, escape="\\"),
                    Panel.name.ilike(like, escape="\\"),
                    Panel.serial.ilike(like, escape="\\"),
                    Panel.customer.ilike(like, escape="\\"),
                )
            )
            .order_by(Panel.tag)
            .limit(per_type)
        )
    ).scalars()
    hits += [
        {
            "type": "panel",
            "id": str(p.id),
            "title": f"{p.tag} · {p.name}",
            "subtitle": p.serial,
            "href": f"/panels/{p.id}",
            # Kept for older clients of this endpoint.
            "tag": p.tag,
            "name": p.name,
            "serial": p.serial,
        }
        for p in panels
    ]

    if allowed_locations is None:
        projects = (
            await session.execute(
                select(Project)
                .where(
                    Project.company_id == company_id,
                    Project.archived_at.is_(None),
                    or_(
                        Project.name.ilike(like, escape="\\"),
                        Project.code.ilike(like, escape="\\"),
                        Project.customer.ilike(like, escape="\\"),
                    ),
                )
                .order_by(Project.name)
                .limit(per_type)
            )
        ).scalars()
        hits += [
            {
                "type": "project",
                "id": str(p.id),
                "title": p.name,
                "subtitle": p.code or p.customer or "",
                "href": f"/panels?project={p.id}",
            }
            for p in projects
        ]
        groups = (
            await session.execute(
                select(SystemGroup, Project.name)
                .join(Project, Project.id == SystemGroup.project_id)
                .where(
                    SystemGroup.company_id == company_id,
                    Project.archived_at.is_(None),
                    or_(
                        SystemGroup.name.ilike(like, escape="\\"),
                        SystemGroup.code.ilike(like, escape="\\"),
                    ),
                )
                .order_by(SystemGroup.name)
                .limit(per_type)
            )
        ).all()
        hits += [
            {
                "type": "system_group",
                "id": str(g.id),
                "title": g.name,
                "subtitle": project_name,
                "href": f"/panels?group={g.id}",
            }
            for g, project_name in groups
        ]

    cabinets = (
        await session.execute(
            panel_scope(select(Cabinet, Panel.tag).join(Panel, Panel.id == Cabinet.panel_id))
            .where(
                or_(Cabinet.name.ilike(like, escape="\\"), Cabinet.code.ilike(like, escape="\\"))
            )
            .order_by(Cabinet.name)
            .limit(per_type)
        )
    ).all()
    hits += [
        {
            "type": "cabinet",
            "id": str(c.id),
            "title": c.name,
            "subtitle": tag,
            "href": f"/panels/{c.panel_id}?tab=cabinets",
        }
        for c, tag in cabinets
    ]

    # Components of the revision that is live on each panel.
    components = (
        await session.execute(
            panel_scope(
                select(Component, Panel.id, Panel.tag).join(
                    Panel, Panel.active_revision_id == Component.revision_id
                )
            )
            .where(
                or_(
                    Component.ref.ilike(like, escape="\\"),
                    Component.description.ilike(like, escape="\\"),
                    Component.part_number.ilike(like, escape="\\"),
                )
            )
            .order_by(Component.ref)
            .limit(per_type)
        )
    ).all()
    hits += [
        {
            "type": "component",
            "id": str(c.id),
            "title": f"{c.ref} · {c.description}".strip(" ·"),
            "subtitle": " · ".join(x for x in (tag, c.part_number) if x),
            "href": f"/panels/{panel_id}?tab=components",
        }
        for c, panel_id, tag in components
    ]

    issue_filter = [Issue.title.ilike(like, escape="\\")]
    if q.lstrip("#").isdigit():
        issue_filter.append(Issue.number == int(q.lstrip("#")))
    issues = (
        await session.execute(
            panel_scope(select(Issue, Panel.tag).join(Panel, Panel.id == Issue.panel_id))
            .where(Issue.company_id == company_id, or_(*issue_filter))
            .order_by(Issue.created_at.desc())
            .limit(per_type)
        )
    ).all()
    hits += [
        {
            "type": "issue",
            "id": str(i.id),
            "title": f"#{i.number} {i.title}",
            "subtitle": f"{tag} · {i.status}",
            "href": f"/issues/{i.id}",
        }
        for i, tag in issues
    ]
    return hits
