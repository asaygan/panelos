"""Audit-log read endpoints (user-management surface)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from panelos_api.api.v1.schemas.user import AuditLogOut
from panelos_api.core.audit import verify_chain
from panelos_api.core.rbac import Permission
from panelos_api.db.models.audit_log import AuditAction, AuditLog
from panelos_api.db.models.user import User
from panelos_api.deps import CurrentMembership, get_db, require_permission

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("/verify")
async def verify_audit_chain(
    m: CurrentMembership = Depends(require_permission(Permission.VIEW_AUDIT)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """Return whether the company's audit hash-chain is intact (tamper-evident)."""
    valid = await verify_chain(db, m.company_id)
    return {"valid": valid}


@router.get("", response_model=list[AuditLogOut])
async def list_audit_logs(
    target_type: str | None = Query(default=None),
    target_id: str | None = Query(default=None),
    action: str | None = Query(
        default=None, description="Exact action or a prefix like 'revision.'"
    ),
    actor_id: uuid.UUID | None = Query(default=None),
    since: datetime | None = Query(default=None),
    until: datetime | None = Query(default=None),
    before: datetime | None = Query(default=None, description="Cursor: created_at of the last row"),
    limit: int = Query(default=50, ge=1, le=200),
    m: CurrentMembership = Depends(require_permission(Permission.VIEW_AUDIT)),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogOut]:
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, User.id == AuditLog.actor_id)
        .where(AuditLog.company_id == m.company_id)
        .order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    )
    if target_type:
        stmt = stmt.where(AuditLog.target_type == target_type)
    if target_id:
        stmt = stmt.where(AuditLog.target_id == target_id)
    if action:
        known = [a for a in AuditAction if a.value == action or a.value.startswith(action)]
        stmt = stmt.where(AuditLog.action.in_(known))
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    if since:
        stmt = stmt.where(AuditLog.created_at >= since)
    if until:
        stmt = stmt.where(AuditLog.created_at <= until)
    if before:
        stmt = stmt.where(AuditLog.created_at < before)
    rows = (await db.execute(stmt.limit(limit))).all()
    return [
        AuditLogOut(
            id=log.id,
            action=log.action.value,
            actor_name=user.name if user else None,
            actor_email=user.email if user else None,
            target_type=log.target_type,
            target_id=log.target_id,
            meta=log.meta or {},
            created_at=log.created_at,
        )
        for log, user in rows
    ]
