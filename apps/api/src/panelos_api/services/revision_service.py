"""Revision state machine + approval pipeline."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Literal

from sqlalchemy import select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import Conflict, NotFound
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession

Action = Literal["submit", "approve", "reject", "supersede"]

ALLOWED: dict[Action, set[RevisionStatus]] = {
    "submit": {RevisionStatus.DRAFT},
    "approve": {RevisionStatus.REVIEW, RevisionStatus.DRAFT},  # one-step approval allowed
    "reject": {RevisionStatus.REVIEW, RevisionStatus.DRAFT},
    "supersede": {RevisionStatus.APPROVED},
}


def _next_letter(prev: str | None) -> str:
    if not prev:
        return "A"
    last = prev[-1].upper()
    if last == "Z":
        return prev + "A"
    return prev[:-1] + chr(ord(last) + 1)


async def create_draft(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    panel_id: uuid.UUID,
    change_summary: str | None,
) -> PanelRevision:
    """Open a new draft revision against a panel."""

    panel = await session.get(Panel, panel_id)
    if panel is None or panel.company_id != company_id:
        raise NotFound("panel not found")

    latest = (
        await session.execute(
            select(PanelRevision)
            .where(PanelRevision.panel_id == panel_id)
            .order_by(PanelRevision.revision_number.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    number = (latest.revision_number if latest else 0) + 1
    letter = _next_letter(latest.revision_letter if latest else None)

    rev = PanelRevision(
        panel_id=panel_id,
        revision_letter=letter,
        revision_number=number,
        status=RevisionStatus.DRAFT,
        change_summary=change_summary,
        created_by=actor_id,
    )
    session.add(rev)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.REVISION_CREATED,
        target_type="revision",
        target_id=str(rev.id),
        meta={"panel_id": str(panel_id), "letter": letter, "number": number},
    )
    return rev


async def transition(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    revision_id: uuid.UUID,
    action: Action,
) -> PanelRevision:
    """Move a revision through the approval pipeline."""

    rev = await session.get(PanelRevision, revision_id)
    if rev is None:
        raise NotFound("revision not found")

    # Lock the parent panel row.
    panel = (
        await session.execute(select(Panel).where(Panel.id == rev.panel_id).with_for_update())
    ).scalar_one_or_none()
    if panel is None or panel.company_id != company_id:
        raise NotFound("panel not found")

    if rev.status not in ALLOWED[action]:
        raise Conflict(f"cannot {action} from {rev.status.value}")

    now = datetime.now(UTC)
    audit_action: AuditAction
    if action == "submit":
        rev.status = RevisionStatus.REVIEW
        rev.submitted_by = actor_id
        rev.submitted_at = now
        audit_action = AuditAction.REVISION_SUBMITTED
    elif action == "reject":
        rev.status = RevisionStatus.REJECTED
        rev.rejected_at = now
        audit_action = AuditAction.REVISION_REJECTED
    elif action == "approve":
        # supersede prior active
        if panel.active_revision_id and panel.active_revision_id != rev.id:
            prior = await session.get(PanelRevision, panel.active_revision_id)
            if prior is not None and prior.status == RevisionStatus.APPROVED:
                prior.status = RevisionStatus.SUPERSEDED
                prior.superseded_at = now
                await append_audit(
                    session,
                    company_id=company_id,
                    actor_id=actor_id,
                    action=AuditAction.REVISION_SUPERSEDED,
                    target_type="revision",
                    target_id=str(prior.id),
                    meta={"superseded_by": str(rev.id)},
                )
        rev.status = RevisionStatus.APPROVED
        rev.approved_by = actor_id
        rev.approved_at = now
        panel.active_revision_id = rev.id
        audit_action = AuditAction.REVISION_APPROVED
    elif action == "supersede":
        rev.status = RevisionStatus.SUPERSEDED
        rev.superseded_at = now
        audit_action = AuditAction.REVISION_SUPERSEDED
    else:  # pragma: no cover
        raise Conflict(f"unknown action {action}")

    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=audit_action,
        target_type="revision",
        target_id=str(rev.id),
        meta={"panel_id": str(panel.id)},
    )
    await session.flush()
    return rev
