"""Revision state machine + approval pipeline."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Literal

from sqlalchemy import select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import Conflict, Forbidden, NotFound
from panelos_api.core.rbac import Permission, Role
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.company import Company
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.services import notification_service

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


EDITABLE: frozenset[RevisionStatus] = frozenset({RevisionStatus.DRAFT})


def ensure_editable(rev: PanelRevision) -> None:
    """Sheets and BOM rows may only change while the revision is a draft.

    Once a revision is in review, approved, rejected or superseded it is a
    controlled record: mutating it would silently change what field staff see
    behind an already-approved QR code.
    """

    if rev.status not in EDITABLE:
        raise Conflict(f"revision is {rev.status.value}; only draft revisions can be edited")


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

    # Lock the panel row: two concurrent drafts must not get the same number.
    panel = (
        await session.execute(select(Panel).where(Panel.id == panel_id).with_for_update())
    ).scalar_one_or_none()
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


async def _assert_may_approve(
    session: AsyncSession,
    *,
    company: Company | None,
    actor_id: uuid.UUID,
    actor_role: Role | None,
    rev: PanelRevision,
) -> None:
    """Company approval policy (on top of the APPROVE_REVISION permission)."""

    if company is None:
        return
    if actor_role is Role.ENGINEER and not company.engineer_can_approve:
        raise Forbidden(
            "engineers cannot approve revisions in this organization",
            code="approval_not_allowed",
        )
    if company.require_four_eyes:
        author = rev.submitted_by or rev.created_by
        if author is not None and author == actor_id:
            raise Forbidden(
                "a revision must be approved by someone other than its author",
                code="four_eyes_required",
            )


async def transition(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    revision_id: uuid.UUID,
    action: Action,
    actor_role: Role | None = None,
    actor_name: str = "",
    note: str | None = None,
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
        raise Conflict(
            f"cannot {action} from {rev.status.value}", code="invalid_revision_transition"
        )

    now = datetime.now(UTC)
    link = f"/panels/{panel.id}?tab=revisions"
    params = {
        "tag": panel.tag,
        "panel": panel.name,
        "rev": rev.revision_letter,
        "actor": actor_name,
    }
    author = rev.submitted_by or rev.created_by
    audit_action: AuditAction
    if action == "submit":
        rev.status = RevisionStatus.REVIEW
        rev.submitted_by = actor_id
        rev.submitted_at = now
        audit_action = AuditAction.REVISION_SUBMITTED
        await notification_service.notify(
            session,
            company_id=company_id,
            user_ids=await notification_service.members_with(
                session, company_id, Permission.APPROVE_REVISION
            ),
            kind="revision_submitted",
            params=params,
            link=link,
            exclude=actor_id,
        )
    elif action == "reject":
        rev.status = RevisionStatus.REJECTED
        rev.rejected_at = now
        rev.rejected_by = actor_id
        rev.review_note = (note or "").strip() or None
        audit_action = AuditAction.REVISION_REJECTED
        reason = f" {rev.review_note}" if rev.review_note else ""
        await notification_service.notify(
            session,
            company_id=company_id,
            user_ids=[author, rev.created_by],
            kind="revision_rejected",
            params={**params, "reason": reason},
            link=link,
            exclude=actor_id,
        )
    elif action == "approve":
        company = await session.get(Company, company_id)
        await _assert_may_approve(
            session, company=company, actor_id=actor_id, actor_role=actor_role, rev=rev
        )
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
        rev.review_note = (note or "").strip() or None
        panel.active_revision_id = rev.id
        audit_action = AuditAction.REVISION_APPROVED
        await notification_service.notify(
            session,
            company_id=company_id,
            user_ids=[author, rev.created_by],
            kind="revision_approved",
            params=params,
            link=link,
            exclude=actor_id,
        )
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
        meta={"panel_id": str(panel.id), **({"note": rev.review_note} if note else {})},
    )
    await session.flush()
    return rev
