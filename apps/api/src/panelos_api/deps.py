"""Shared FastAPI dependencies."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from panelos_api.config import Settings, get_settings
from panelos_api.core import outbox
from panelos_api.core.exceptions import Forbidden, Unauthorized
from panelos_api.core.rbac import Permission, Role, has_permission
from panelos_api.core.security import verify_token
from panelos_api.db.models.user import User
from panelos_api.db.session import (
    enter_system_scope,
    get_sessionmaker,
    mark_request_session,
    set_tenant_guc,
)
from panelos_api.repositories.membership_repo import MembershipRepo
from panelos_api.storage.factory import get_storage as _build_storage

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.db.models.membership import Membership
    from panelos_api.storage.base import StorageProvider

_bearer = HTTPBearer(auto_error=False)


@dataclass(slots=True)
class CurrentUser:
    id: uuid.UUID
    email: str
    name: str
    locale: str = "tr"
    mfa_enabled: bool = False


@dataclass(slots=True)
class CurrentMembership:
    user: CurrentUser
    company_id: uuid.UUID
    role: Role
    membership_id: uuid.UUID | None = None

    def can(self, perm: Permission) -> bool:
        return has_permission(self.role, perm)


# How often a member's "last active" timestamp is refreshed (avoids a write on
# every single request).
_LAST_ACTIVE_EVERY = timedelta(minutes=5)


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield a transactional async session."""

    sm = get_sessionmaker()
    async with sm() as session:
        # Deny-by-default RLS context; narrowed to a tenant by
        # get_current_membership or widened by get_system_db.
        mark_request_session(session, role=get_settings().DB_APP_ROLE)
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            outbox.discard(session)
            raise
        # Emails / notifications queued by services fire only after the commit.
        outbox.dispatch(session)


async def get_system_db(db: AsyncSession = Depends(get_db)) -> AsyncSession:
    """Request session allowed to look across tenants.

    For the few endpoints that must find a row before any tenant is known:
    auth (login / refresh / invite accept / bootstrap) and public QR resolve.
    """

    await enter_system_scope(db)
    return db


async def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """Resolve the bearer token to a ``User``."""

    token = (
        creds.credentials if creds and creds.credentials else request.cookies.get("panelos_session")
    )
    if not token:
        raise Unauthorized("missing bearer token or session cookie")
    claims = verify_token(token, expected_type="access", settings=settings)
    user_id = uuid.UUID(str(claims["sub"]))
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise Unauthorized("user not found or disabled")
    request.state.user_id = str(user.id)
    return CurrentUser(
        id=user.id,
        email=user.email,
        name=user.name,
        locale=user.locale,
        mfa_enabled=user.mfa_enabled,
    )


async def get_optional_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CurrentUser | None:
    """Like ``get_current_user`` but returns None instead of 401 when unauthenticated.

    Used by public endpoints (QR resolve) that behave differently for an
    authenticated same-company member vs an anonymous scanner.
    """

    token = (
        creds.credentials if creds and creds.credentials else request.cookies.get("panelos_session")
    )
    if not token:
        return None
    try:
        claims = verify_token(token, expected_type="access", settings=settings)
        user_id = uuid.UUID(str(claims["sub"]))
    except Exception:
        return None
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        return None
    request.state.user_id = str(user.id)
    return CurrentUser(
        id=user.id,
        email=user.email,
        name=user.name,
        locale=user.locale,
        mfa_enabled=user.mfa_enabled,
    )


async def get_current_membership(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> CurrentMembership:
    """Resolve the active membership (company) from ``X-Company-Id`` or sole membership."""

    # Which companies the user belongs to is itself a cross-tenant question.
    await enter_system_scope(db)
    repo = MembershipRepo(db)
    # Only ACTIVE memberships grant access. "invited" (not yet accepted) and
    # "suspended" rows exist in the table but must never authorize a request.
    memberships: list[Membership] = [
        mm for mm in await repo.for_user(user.id) if mm.status == "active"
    ]
    if not memberships:
        raise Forbidden("no active company membership")

    if x_company_id:
        try:
            cid = uuid.UUID(x_company_id)
        except ValueError as exc:
            raise Forbidden("invalid X-Company-Id") from exc
        m = next((m for m in memberships if m.company_id == cid), None)
        if m is None:
            raise Forbidden("not a member of this company")
    else:
        # No explicit company: deterministic default = oldest active membership.
        m = sorted(memberships, key=lambda mm: mm.created_at)[0]

    await set_tenant_guc(db, m.company_id)
    now = datetime.now(UTC)
    if m.last_active_at is None or now - m.last_active_at > _LAST_ACTIVE_EVERY:
        m.last_active_at = now
    return CurrentMembership(user=user, company_id=m.company_id, role=m.role, membership_id=m.id)


def require_role(*roles: Role):  # type: ignore[no-untyped-def]
    """Dependency factory restricting to specific roles."""

    async def _dep(m: CurrentMembership = Depends(get_current_membership)) -> CurrentMembership:
        if m.role not in roles:
            raise Forbidden(f"role {m.role.value} not permitted")
        return m

    return _dep


def require_permission(perm: Permission):  # type: ignore[no-untyped-def]
    """Dependency factory enforcing a single permission."""

    async def _dep(m: CurrentMembership = Depends(get_current_membership)) -> CurrentMembership:
        if not has_permission(m.role, perm):
            raise Forbidden(f"permission denied: {perm.value}")
        return m

    return _dep


def get_storage(settings: Settings = Depends(get_settings)) -> StorageProvider:
    return _build_storage(settings)
