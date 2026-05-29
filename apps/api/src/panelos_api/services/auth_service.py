"""Auth flows: signup, login, refresh, logout, invitations."""

from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

import pyotp
from sqlalchemy import select

from panelos_api.config import get_settings
from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import Conflict, NotFound, Unauthorized
from panelos_api.core.ids import new_invitation_token
from panelos_api.core.rbac import Role
from panelos_api.core.security import hash_password, issue_token, verify_password, verify_token
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.company import Company
from panelos_api.db.models.invitation import Invitation
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.session import UserSession
from panelos_api.db.models.user import User

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(slots=True)
class TokenPair:
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def _hash_refresh(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def signup_company_owner(
    session: AsyncSession,
    *,
    company_name: str,
    company_slug: str,
    owner_email: str,
    owner_name: str,
    password: str,
) -> tuple[Company, User, Membership]:
    """Bootstrap a new tenant with an Owner member."""

    existing = (
        await session.execute(select(Company).where(Company.slug == company_slug))
    ).scalar_one_or_none()
    if existing:
        raise Conflict(f"company slug already in use: {company_slug}")

    company = Company(name=company_name, slug=company_slug)
    session.add(company)
    await session.flush()

    user_existing = (
        await session.execute(select(User).where(User.email == owner_email.lower()))
    ).scalar_one_or_none()
    if user_existing:
        raise Conflict("email already registered")

    user = User(email=owner_email.lower(), name=owner_name, password_hash=hash_password(password))
    session.add(user)
    await session.flush()

    membership = Membership(
        company_id=company.id,
        user_id=user.id,
        role=Role.OWNER,
        accepted_at=datetime.now(UTC),
    )
    session.add(membership)
    await session.flush()
    return company, user, membership


async def login(
    session: AsyncSession,
    *,
    email: str,
    password: str,
    mfa_code: str | None = None,
    device: str | None = None,
) -> tuple[User, TokenPair]:
    """Validate credentials, return tokens. Records refresh hash in sessions."""

    user = (
        await session.execute(select(User).where(User.email == email.lower()))
    ).scalar_one_or_none()
    if user is None or user.password_hash is None or not verify_password(password, user.password_hash):
        raise Unauthorized("invalid credentials")
    if not user.is_active:
        raise Unauthorized("user disabled")
    if user.mfa_secret and (not mfa_code or not pyotp.TOTP(user.mfa_secret).verify(mfa_code)):
        raise Unauthorized("invalid mfa code")

    settings = get_settings()
    memberships = (
        await session.execute(select(Membership).where(Membership.user_id == user.id))
    ).scalars().all()
    company_ids = [str(m.company_id) for m in memberships]

    access = issue_token(
        subject=str(user.id),
        token_type="access",
        extra_claims={"companies": company_ids},
    )
    refresh = issue_token(subject=str(user.id), token_type="refresh")
    sess = UserSession(
        user_id=user.id,
        token_hash=_hash_refresh(refresh),
        device=device,
        expires_at=datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS),
    )
    session.add(sess)
    user.last_login_at = datetime.now(UTC)
    await session.flush()
    return user, TokenPair(access_token=access, refresh_token=refresh)


async def refresh_tokens(session: AsyncSession, *, refresh_token: str) -> TokenPair:
    """Rotate a refresh token (one-time-use)."""

    claims = verify_token(refresh_token, expected_type="refresh")
    th = _hash_refresh(refresh_token)
    sess = (
        await session.execute(select(UserSession).where(UserSession.token_hash == th))
    ).scalar_one_or_none()
    if sess is None or sess.revoked_at is not None:
        raise Unauthorized("refresh token revoked or unknown")
    sess.revoked_at = datetime.now(UTC)

    user_id = uuid.UUID(str(claims["sub"]))
    user = await session.get(User, user_id)
    if user is None:
        raise Unauthorized("user no longer exists")

    new_access = issue_token(subject=str(user.id), token_type="access")
    new_refresh = issue_token(subject=str(user.id), token_type="refresh")
    settings = get_settings()
    session.add(
        UserSession(
            user_id=user.id,
            token_hash=_hash_refresh(new_refresh),
            device=sess.device,
            expires_at=datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS),
        )
    )
    await session.flush()
    return TokenPair(access_token=new_access, refresh_token=new_refresh)


async def logout(session: AsyncSession, *, refresh_token: str) -> None:
    """Revoke the refresh token."""

    th = _hash_refresh(refresh_token)
    sess = (
        await session.execute(select(UserSession).where(UserSession.token_hash == th))
    ).scalar_one_or_none()
    if sess is not None and sess.revoked_at is None:
        sess.revoked_at = datetime.now(UTC)
        await session.flush()


async def invite_member(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    email: str,
    role: Role,
) -> Invitation:
    """Create a pending invitation."""

    inv = Invitation(
        company_id=company_id,
        email=email.lower(),
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
        target_type="invitation",
        target_id=str(inv.id),
        meta={"email": inv.email, "role": role.value},
    )
    return inv


async def accept_invite(
    session: AsyncSession,
    *,
    token: str,
    name: str,
    password: str,
) -> tuple[User, Membership]:
    """Materialize a user + membership from an invitation token."""

    inv = (
        await session.execute(select(Invitation).where(Invitation.token == token))
    ).scalar_one_or_none()
    if inv is None or inv.accepted_at is not None or inv.expires_at < datetime.now(UTC):
        raise NotFound("invitation invalid or expired")

    user = (
        await session.execute(select(User).where(User.email == inv.email))
    ).scalar_one_or_none()
    if user is None:
        user = User(email=inv.email, name=name, password_hash=hash_password(password))
        session.add(user)
        await session.flush()

    membership = Membership(
        company_id=inv.company_id,
        user_id=user.id,
        role=inv.role,
        accepted_at=datetime.now(UTC),
    )
    session.add(membership)
    inv.accepted_at = datetime.now(UTC)
    await session.flush()
    return user, membership
