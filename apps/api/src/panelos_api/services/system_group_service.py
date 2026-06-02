"""System Group lifecycle (MCC/LVDP/PLC/… buckets inside a Project)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import NotFound
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.group_status_history import GroupStatusHistory
from panelos_api.db.models.lifecycle import LifecycleStatus
from panelos_api.db.models.project import Project
from panelos_api.db.models.system_group import GroupType, SystemGroup

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


async def _get(
    session: AsyncSession, *, company_id: uuid.UUID, system_group_id: uuid.UUID
) -> SystemGroup:
    row = (
        await session.execute(
            select(SystemGroup).where(
                SystemGroup.id == system_group_id, SystemGroup.company_id == company_id
            )
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFound("system group not found")
    return row


async def create_system_group(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    project_id: uuid.UUID,
    name: str,
    code: str | None = None,
    group_type: GroupType = GroupType.CUSTOM,
    lifecycle_status: LifecycleStatus = LifecycleStatus.DRAFT,
    description: str | None = None,
) -> SystemGroup:
    # Parent project must belong to the caller's company.
    project = (
        await session.execute(
            select(Project).where(Project.id == project_id, Project.company_id == company_id)
        )
    ).scalar_one_or_none()
    if project is None:
        raise NotFound("project not found")

    group = SystemGroup(
        company_id=company_id,
        project_id=project_id,
        name=name,
        code=code,
        group_type=group_type,
        lifecycle_status=lifecycle_status,
        description=description,
    )
    session.add(group)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.SYSTEM_GROUP_CREATED,
        target_type="system_group",
        target_id=str(group.id),
        meta={"name": name, "type": group_type.value, "project_id": str(project_id)},
    )
    session.add(
        GroupStatusHistory(
            company_id=company_id,
            system_group_id=group.id,
            from_status=None,
            to_status=group.lifecycle_status,
            changed_by=actor_id,
        )
    )
    await session.flush()
    return group


async def update_system_group(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    system_group_id: uuid.UUID,
    changes: dict[str, Any],
) -> SystemGroup:
    group = await _get(session, company_id=company_id, system_group_id=system_group_id)
    forbidden = {"id", "company_id", "created_at"}

    # If the project_id changes, validate that the target belongs to the company.
    if changes.get("project_id"):
        target_pid = changes["project_id"]
        if isinstance(target_pid, str):
            target_pid = uuid.UUID(target_pid)
        if not (
            await session.execute(
                select(Project.id).where(Project.id == target_pid, Project.company_id == company_id)
            )
        ).scalar_one_or_none():
            raise NotFound("target project not found")

    prev_status: LifecycleStatus = group.lifecycle_status
    status_change: tuple[LifecycleStatus, LifecycleStatus] | None = None
    applied: dict[str, Any] = {}

    for k, v in changes.items():
        if k in forbidden or not hasattr(group, k):
            continue
        if k == "lifecycle_status":
            new_status = v if isinstance(v, LifecycleStatus) else LifecycleStatus(v)
            if new_status != prev_status:
                group.lifecycle_status = new_status
                status_change = (prev_status, new_status)
            continue
        setattr(group, k, v)
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
            action=AuditAction.SYSTEM_GROUP_UPDATED,
            target_type="system_group",
            target_id=str(group.id),
            meta={"changes": applied},
        )
    if status_change is not None:
        old, new = status_change
        session.add(
            GroupStatusHistory(
                company_id=company_id,
                system_group_id=group.id,
                from_status=old,
                to_status=new,
                changed_by=actor_id,
            )
        )
        await append_audit(
            session,
            company_id=company_id,
            actor_id=actor_id,
            action=AuditAction.SYSTEM_GROUP_STATUS_CHANGED,
            target_type="system_group",
            target_id=str(group.id),
            meta={"from": old.value, "to": new.value},
        )
        await session.flush()
    return group


async def delete_system_group(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    system_group_id: uuid.UUID,
) -> None:
    group = await _get(session, company_id=company_id, system_group_id=system_group_id)
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.SYSTEM_GROUP_DELETED,
        target_type="system_group",
        target_id=str(group.id),
        meta={"project_id": str(group.project_id)},
    )
    await session.delete(group)
    await session.flush()


async def list_status_history(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    system_group_id: uuid.UUID,
    limit: int = 200,
) -> list[GroupStatusHistory]:
    await _get(session, company_id=company_id, system_group_id=system_group_id)
    rows = (
        await session.execute(
            select(GroupStatusHistory)
            .where(
                GroupStatusHistory.company_id == company_id,
                GroupStatusHistory.system_group_id == system_group_id,
            )
            .order_by(GroupStatusHistory.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
    return list(rows)
