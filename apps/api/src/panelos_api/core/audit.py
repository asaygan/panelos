"""Append-only audit log with SHA-256 hash chain."""

from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from panelos_api.db.models.audit_log import AuditAction, AuditLog

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


def _canonical_json(payload: dict[str, Any]) -> bytes:
    """Deterministic JSON for hashing."""

    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")


def compute_hash(prev_hash: bytes, row: dict[str, Any]) -> bytes:
    """Return sha256(prev_hash || canonical_json(row))."""

    h = hashlib.sha256()
    h.update(prev_hash or b"")
    h.update(_canonical_json(row))
    return h.digest()


async def append_audit(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    action: AuditAction,
    target_type: str,
    target_id: str,
    meta: dict[str, Any] | None = None,
) -> AuditLog:
    """Append a tamper-evident audit entry."""

    last = (
        await session.execute(
            select(AuditLog)
            .where(AuditLog.company_id == company_id)
            .order_by(AuditLog.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    prev_hash = last.hash if last else b""

    row = {
        "company_id": str(company_id),
        "actor_id": str(actor_id) if actor_id else None,
        "action": action.value,
        "target_type": target_type,
        "target_id": target_id,
        "meta": meta or {},
    }
    digest = compute_hash(prev_hash, row)
    entry = AuditLog(
        company_id=company_id,
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        meta=meta or {},
        prev_hash=prev_hash,
        hash=digest,
    )
    session.add(entry)
    await session.flush()
    return entry


async def verify_chain(session: AsyncSession, company_id: uuid.UUID) -> bool:
    """Walk the chain and verify each hash."""

    rows = (
        await session.execute(
            select(AuditLog)
            .where(AuditLog.company_id == company_id)
            .order_by(AuditLog.created_at.asc())
        )
    ).scalars().all()

    prev = b""
    for r in rows:
        row = {
            "company_id": str(r.company_id),
            "actor_id": str(r.actor_id) if r.actor_id else None,
            "action": r.action.value if hasattr(r.action, "value") else str(r.action),
            "target_type": r.target_type,
            "target_id": r.target_id,
            "meta": r.meta or {},
        }
        expected = compute_hash(prev, row)
        if expected != r.hash:
            return False
        prev = r.hash
    return True
