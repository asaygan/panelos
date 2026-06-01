"""Audit-log read endpoints (user-management surface)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select

from panelos_api.api.v1.schemas.user import AuditLogOut
from panelos_api.core.audit import verify_chain
from panelos_api.core.rbac import Permission
from panelos_api.db.models.audit_log import AuditLog
from panelos_api.db.models.user import User
from panelos_api.deps import CurrentMembership, get_db, require_permission

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("/verify")
async def verify_audit_chain(
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    """Return whether the company's audit hash-chain is intact (tamper-evident)."""
    valid = await verify_chain(db, m.company_id)
    return {"valid": valid}


@router.get("", response_model=list[AuditLogOut])
async def list_audit_logs(
    target_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
) -> list[AuditLogOut]:
    stmt = (
        select(AuditLog, User)
        .outerjoin(User, User.id == AuditLog.actor_id)
        .where(AuditLog.company_id == m.company_id)
        .order_by(AuditLog.created_at.desc())
    )
    if target_type:
        stmt = stmt.where(AuditLog.target_type == target_type)
    stmt = stmt.limit(limit)
    rows = (await db.execute(stmt)).all()
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
