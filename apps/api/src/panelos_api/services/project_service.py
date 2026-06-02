"""Project lifecycle (top of the asset tree)."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import NotFound
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.lifecycle import LifecycleStatus
from panelos_api.db.models.project import Project
from panelos_api.db.models.project_status_history import ProjectStatusHistory

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


async def _get(session: AsyncSession, *, company_id: uuid.UUID, project_id: uuid.UUID) -> Project:
    row = (
        await session.execute(
            select(Project).where(Project.id == project_id, Project.company_id == company_id)
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("project not found")
    return row


async def create_project(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    name: str,
    code: str | None = None,
    customer: str | None = None,
    site: str | None = None,
    description: str | None = None,
    location_id: uuid.UUID | None = None,
    lifecycle_status: LifecycleStatus = LifecycleStatus.DRAFT,
) -> Project:
    project = Project(
        company_id=company_id,
        name=name,
        code=code,
        customer=customer,
        site=site,
        description=description,
        location_id=location_id,
        lifecycle_status=lifecycle_status,
    )
    session.add(project)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PROJECT_CREATED,
        target_type="project",
        target_id=str(project.id),
        meta={"name": name},
    )
    # Seed initial status_history row.
    session.add(
        ProjectStatusHistory(
            company_id=company_id,
            project_id=project.id,
            from_status=None,
            to_status=project.lifecycle_status,
            changed_by=actor_id,
        )
    )
    await session.flush()
    return project


async def update_project(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    project_id: uuid.UUID,
    changes: dict[str, Any],
) -> Project:
    project = await _get(session, company_id=company_id, project_id=project_id)
    forbidden = {"id", "company_id", "created_at"}

    prev_status: LifecycleStatus = project.lifecycle_status
    status_change: tuple[LifecycleStatus, LifecycleStatus] | None = None
    applied: dict[str, Any] = {}

    for k, v in changes.items():
        if k in forbidden or not hasattr(project, k):
            continue
        if k == "lifecycle_status":
            new_status = v if isinstance(v, LifecycleStatus) else LifecycleStatus(v)
            if new_status != prev_status:
                project.lifecycle_status = new_status
                status_change = (prev_status, new_status)
            continue
        setattr(project, k, v)
        if hasattr(v, "value"):
            applied[k] = v.value
        elif isinstance(v, uuid.UUID):
            applied[k] = str(v)
        else:
            applied[k] = v
    await session.flush()

    if applied:
        await append_audit(
            session,
            company_id=company_id,
            actor_id=actor_id,
            action=AuditAction.PROJECT_UPDATED,
            target_type="project",
            target_id=str(project.id),
            meta={"changes": applied},
        )
    if status_change is not None:
        old, new = status_change
        session.add(
            ProjectStatusHistory(
                company_id=company_id,
                project_id=project.id,
                from_status=old,
                to_status=new,
                changed_by=actor_id,
            )
        )
        await append_audit(
            session,
            company_id=company_id,
            actor_id=actor_id,
            action=AuditAction.PROJECT_STATUS_CHANGED,
            target_type="project",
            target_id=str(project.id),
            meta={"from": old.value, "to": new.value},
        )
        await session.flush()
    return project


async def archive_project(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    project_id: uuid.UUID,
) -> Project:
    project = await _get(session, company_id=company_id, project_id=project_id)
    project.archived_at = datetime.now(UTC)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PROJECT_ARCHIVED,
        target_type="project",
        target_id=str(project.id),
        meta={},
    )
    return project


async def list_status_history(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    limit: int = 200,
) -> list[ProjectStatusHistory]:
    await _get(session, company_id=company_id, project_id=project_id)
    rows = (
        await session.execute(
            select(ProjectStatusHistory)
            .where(
                ProjectStatusHistory.company_id == company_id,
                ProjectStatusHistory.project_id == project_id,
            )
            .order_by(ProjectStatusHistory.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return list(rows)
