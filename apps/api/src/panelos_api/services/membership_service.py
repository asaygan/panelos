"""User-management rules + audit writes for memberships.

Authorization is layered:
  - ``require_permission(Permission.MANAGE_USERS)`` gates the endpoints.
  - The explicit rules here (last-owner / self / admin-vs-owner) raise
    ``Forbidden`` / ``Conflict`` and are the source of truth for the guarantees.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import delete, select

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import Conflict, Forbidden, NotFound
from panelos_api.core.ids import new_invitation_token
from panelos_api.core.rbac import Role
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.invitation import Invitation
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.membership_location_access import MembershipLocationAccess
from panelos_api.db.models.user import User
from panelos_api.repositories.membership_repo import MembershipRepo

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

VALID_STATUSES = ("active", "suspended")


async def _get_membership(
    session: AsyncSession, *, membership_id: uuid.UUID, company_id: uuid.UUID
) -> Membership:
    mem = await MembershipRepo(session).get_in_company(membership_id, company_id)
    if mem is None:
        raise NotFound("membership not found")
    return mem


def _assert_admin_can_target(actor_role: Role, target_role: Role) -> None:
    """ADMIN cannot act on an OWNER membership."""

    if actor_role == Role.ADMIN and target_role == Role.OWNER:
        raise Forbidden("admins cannot act on an owner")


async def _assert_not_last_owner(
    session: AsyncSession, *, company_id: uuid.UUID, target: Membership, action: str
) -> None:
    if target.role == Role.OWNER and target.status == "active":
        owners = await MembershipRepo(session).count_active_owners(company_id)
        if owners <= 1:
            raise Forbidden(f"cannot {action} the last active owner")


async def invite(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    actor_role: Role,
    email: str,
    role: Role,
    location_ids: list[uuid.UUID] | None = None,
    message: str | None = None,
) -> Invitation:
    """Create an invited membership + invitation token + location access."""

    if actor_role == Role.ADMIN and role == Role.OWNER:
        raise Forbidden("admins cannot assign the owner role")

    email = email.lower()
    # Dedupe: an existing active/invited membership for this email, or a pending invite.
    existing_mem = (
        await session.execute(
            select(Membership)
            .join(User, User.id == Membership.user_id)
            .where(
                Membership.company_id == company_id,
                User.email == email,
                Membership.status.in_(("active", "invited")),
            )
        )
    ).scalar_one_or_none()
    if existing_mem is not None:
        raise Conflict("a member or invitation already exists for this email")

    pending_inv = (
        await session.execute(
            select(Invitation).where(
                Invitation.company_id == company_id,
                Invitation.email == email,
                Invitation.accepted_at.is_(None),
                Invitation.expires_at > datetime.now(UTC),
            )
        )
    ).scalar_one_or_none()
    if pending_inv is not None:
        raise Conflict("a pending invitation already exists for this email")

    # Materialize a placeholder user (no password) so the membership can exist.
    user = (
        await session.execute(select(User).where(User.email == email))
    ).scalar_one_or_none()
    if user is None:
        user = User(email=email, name=email.split("@")[0], is_active=False)
        session.add(user)
        await session.flush()

    membership = Membership(
        company_id=company_id,
        user_id=user.id,
        role=role,
        status="invited",
        invited_by_user_id=actor_id,
        invited_at=datetime.now(UTC),
    )
    session.add(membership)
    await session.flush()

    for loc_id in location_ids or []:
        session.add(
            MembershipLocationAccess(
                company_id=company_id, membership_id=membership.id, location_id=loc_id
            )
        )

    inv = Invitation(
        company_id=company_id,
        email=email,
        role=role,
        token=new_invitation_token(),
        expires_at=datetime.now(UTC) + timedelta(days=14),
    )
    session.add(inv)
    await session.flush()

    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.USER_INVITED,
        target_type="membership",
        target_id=str(membership.id),
        meta={
            "target_email": email,
            "role": role.value,
            "invited_by": str(actor_id),
            "message": message,
        },
    )
    return inv


async def change_role(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    actor_role: Role,
    membership_id: uuid.UUID,
    new_role: Role,
) -> Membership:
    mem = await _get_membership(session, membership_id=membership_id, company_id=company_id)
    _assert_admin_can_target(actor_role, mem.role)
    if actor_role == Role.ADMIN and new_role == Role.OWNER:
        raise Forbidden("admins cannot assign the owner role")

    if mem.user_id == actor_id and new_role != mem.role:
        # Self-change is only blocked for a downgrade away from current role.
        raise Forbidden("you cannot change your own role")

    old_role = mem.role
    if old_role == new_role:
        return mem

    # Downgrading the last owner away from OWNER is forbidden.
    if old_role == Role.OWNER and new_role != Role.OWNER:
        await _assert_not_last_owner(
            session, company_id=company_id, target=mem, action="downgrade"
        )

    mem.role = new_role
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.USER_ROLE_CHANGED,
        target_type="membership",
        target_id=str(mem.id),
        meta={"old_role": old_role.value, "new_role": new_role.value},
    )
    return mem


async def change_status(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    actor_role: Role,
    membership_id: uuid.UUID,
    new_status: str,
) -> Membership:
    if new_status not in VALID_STATUSES:
        raise Conflict(f"invalid status: {new_status}")

    mem = await _get_membership(session, membership_id=membership_id, company_id=company_id)
    _assert_admin_can_target(actor_role, mem.role)

    if new_status == "suspended":
        if mem.user_id == actor_id:
            raise Forbidden("you cannot suspend yourself")
        await _assert_not_last_owner(
            session, company_id=company_id, target=mem, action="suspend"
        )
        mem.status = "suspended"
        mem.suspended_at = datetime.now(UTC)
        action = AuditAction.USER_SUSPENDED
    else:
        mem.status = "active"
        mem.suspended_at = None
        action = AuditAction.USER_ACTIVATED

    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=action,
        target_type="membership",
        target_id=str(mem.id),
        meta={"status": new_status},
    )
    return mem


async def remove(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    actor_role: Role,
    membership_id: uuid.UUID,
) -> None:
    mem = await _get_membership(session, membership_id=membership_id, company_id=company_id)
    _assert_admin_can_target(actor_role, mem.role)

    if mem.user_id == actor_id:
        raise Forbidden("you cannot remove yourself")
    await _assert_not_last_owner(session, company_id=company_id, target=mem, action="remove")

    target_email = (await session.get(User, mem.user_id)).email if mem.user_id else None
    await session.execute(
        delete(MembershipLocationAccess).where(
            MembershipLocationAccess.membership_id == mem.id
        )
    )
    await session.delete(mem)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.USER_REMOVED,
        target_type="membership",
        target_id=str(membership_id),
        meta={"target_email": target_email, "role": mem.role.value},
    )


async def resend_invite(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    membership_id: uuid.UUID,
) -> Invitation:
    mem = await _get_membership(session, membership_id=membership_id, company_id=company_id)
    if mem.status != "invited":
        raise Conflict("can only resend invitations for invited members")

    user = await session.get(User, mem.user_id)
    email = user.email if user else ""
    inv = (
        await session.execute(
            select(Invitation)
            .where(Invitation.company_id == company_id, Invitation.email == email)
            .order_by(Invitation.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if inv is None:
        inv = Invitation(
            company_id=company_id,
            email=email,
            role=mem.role,
            token=new_invitation_token(),
            expires_at=datetime.now(UTC) + timedelta(days=14),
        )
        session.add(inv)
    else:
        inv.token = new_invitation_token()
        inv.expires_at = datetime.now(UTC) + timedelta(days=14)
        inv.accepted_at = None
    mem.invited_at = datetime.now(UTC)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.INVITE_RESENT,
        target_type="membership",
        target_id=str(mem.id),
        meta={"target_email": email},
    )
    return inv


async def assign_locations(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    actor_role: Role,
    membership_id: uuid.UUID,
    location_ids: list[uuid.UUID],
) -> Membership:
    mem = await _get_membership(session, membership_id=membership_id, company_id=company_id)
    _assert_admin_can_target(actor_role, mem.role)

    await session.execute(
        delete(MembershipLocationAccess).where(
            MembershipLocationAccess.membership_id == mem.id
        )
    )
    for loc_id in location_ids:
        session.add(
            MembershipLocationAccess(
                company_id=company_id, membership_id=mem.id, location_id=loc_id
            )
        )
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.LOCATIONS_ASSIGNED,
        target_type="membership",
        target_id=str(mem.id),
        meta={"location_ids": [str(x) for x in location_ids]},
    )
    return mem
