"""Panel lifecycle."""

from __future__ import annotations

import re
import secrets
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import NotFound
from panelos_api.core.ids import new_qr_token
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.panel import Panel, PanelStatus
from panelos_api.repositories.panel_repo import PanelRepo

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


def _slug_tag(name: str) -> str:
    """Derive an uppercase hyphenated tag base from a free-text name."""
    base = re.sub(r"[^A-Za-z0-9]+", "-", name).strip("-").upper()[:32]
    return base or "PANEL"


async def _unique_tag(session: AsyncSession, *, company_id: uuid.UUID, base: str) -> str:
    """Return ``base`` (or ``base-2``, ``base-3``…) not yet used in the company."""
    existing = set(
        (
            await session.execute(
                select(Panel.tag).where(
                    Panel.company_id == company_id, Panel.tag.like(f"{base}%")
                )
            )
        ).scalars().all()
    )
    if base not in existing:
        return base
    i = 2
    while f"{base}-{i}" in existing:
        i += 1
    return f"{base}-{i}"


async def create_panel(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    name: str,
    tag: str | None = None,
    serial: str | None = None,
    location_id: uuid.UUID | None = None,
    **metadata: Any,
) -> Panel:
    # Quick-create: derive a unique tag from the name and a unique serial when omitted.
    if not tag:
        tag = await _unique_tag(session, company_id=company_id, base=_slug_tag(name))
    if not serial:
        serial = f"{tag}-{secrets.token_hex(3).upper()}"
    panel = Panel(
        company_id=company_id,
        tag=tag,
        serial=serial,
        name=name,
        location_id=location_id,
        qr_token=new_qr_token(),
        status=PanelStatus.OK,
        **{k: v for k, v in metadata.items() if hasattr(Panel, k)},
    )
    session.add(panel)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_CREATED,
        target_type="panel",
        target_id=str(panel.id),
        meta={"tag": tag, "serial": serial},
    )
    return panel


async def update_metadata(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_id: uuid.UUID,
    changes: dict[str, Any],
) -> Panel:
    repo = PanelRepo(session, company_id)
    panel = await repo.get(panel_id)
    if panel is None:
        raise NotFound("panel not found")
    forbidden = {"id", "company_id", "qr_token", "created_at"}
    applied: dict[str, Any] = {}
    for k, v in changes.items():
        if k in forbidden or not hasattr(panel, k):
            continue
        setattr(panel, k, v)
        # Coerce non-JSON-serializable values (UUID, Enum) for the audit meta.
        if hasattr(v, "value"):
            applied[k] = v.value
        elif isinstance(v, uuid.UUID):
            applied[k] = str(v)
        else:
            applied[k] = v
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_UPDATED,
        target_type="panel",
        target_id=str(panel.id),
        meta={"changes": applied},
    )
    return panel


async def archive_panel(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_id: uuid.UUID,
) -> Panel:
    repo = PanelRepo(session, company_id)
    panel = await repo.get(panel_id)
    if panel is None:
        raise NotFound("panel not found")
    panel.archived_at = datetime.now(UTC)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.PANEL_ARCHIVED,
        target_type="panel",
        target_id=str(panel.id),
        meta={},
    )
    return panel
