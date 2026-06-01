"""Shared FastAPI dependencies."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import TYPE_CHECKING

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from panelos_api.config import Settings, get_settings
from panelos_api.core.exceptions import Forbidden, Unauthorized
from panelos_api.core.rbac import Permission, Role, has_permission
from panelos_api.core.security import verify_token
from panelos_api.db.models.user import User
from panelos_api.db.session import get_sessionmaker, set_tenant_guc
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


@dataclass(slots=True)
class CurrentMembership:
    user: CurrentUser
    company_id: uuid.UUID
    role: Role


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield a transactional async session."""

    sm = get_sessionmaker()
    async with sm() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    """Resolve the bearer token to a ``User``."""

    token = creds.credentials if creds and creds.credentials else request.cookies.get("panelos_session")
    if not token:
        raise Unauthorized("missing bearer token or session cookie")
    claims = verify_token(token, expected_type="access", settings=settings)
    user_id = uuid.UUID(str(claims["sub"]))
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise Unauthorized("user not found or disabled")
    request.state.user_id = str(user.id)
    return CurrentUser(id=user.id, email=user.email, name=user.name)


async def get_current_membership(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> CurrentMembership:
    """Resolve the active membership (company) from ``X-Company-Id`` or sole membership."""

    repo = MembershipRepo(db)
    memberships: list[Membership] = await repo.for_user(user.id)
    if not memberships:
        raise Forbidden("no company membership")

    if x_company_id:
        cid = uuid.UUID(x_company_id)
        m = next((m for m in memberships if m.company_id == cid), None)
        if m is None:
            raise Forbidden("not a member of this company")
    elif len(memberships) == 1:
        m = memberships[0]
    else:
        # Multi-membership user without an explicit X-Company-Id: fall back to a
        # deterministic default (first *active* membership ordered by created_at)
        # instead of hard-403ing the request.
        active = sorted(
            (mm for mm in memberships if mm.status == "active"),
            key=lambda mm: mm.created_at,
        )
        candidates = active or sorted(memberships, key=lambda mm: mm.created_at)
        m = candidates[0]

    await set_tenant_guc(db, m.company_id)
    return CurrentMembership(user=user, company_id=m.company_id, role=m.role)


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
