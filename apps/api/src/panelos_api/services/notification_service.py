"""In-app notifications + their email counterpart."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select, update

from panelos_api.config import get_settings
from panelos_api.core import mail_templates, outbox
from panelos_api.core.email import send_mail_async
from panelos_api.core.rbac import ROLE_PERMISSIONS, Permission, Role
from panelos_api.db.models.company import Company
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.notification import Notification
from panelos_api.db.models.user import User

if TYPE_CHECKING:
    from collections.abc import Iterable

    from sqlalchemy.ext.asyncio import AsyncSession


def _enabled(user: User, channel: str, kind: str) -> bool:
    """A channel/kind is on unless the user explicitly turned it off."""

    prefs = (user.notification_prefs or {}).get(channel) or {}
    return bool(prefs.get(kind, True))


async def members_with(
    session: AsyncSession, company_id: uuid.UUID, perm: Permission
) -> list[uuid.UUID]:
    """User ids of active members whose role grants ``perm``."""

    roles = [role for role in Role if perm in ROLE_PERMISSIONS[role]]
    if perm is Permission.APPROVE_REVISION:
        company = await session.get(Company, company_id)
        if company is not None and not company.engineer_can_approve:
            roles = [r for r in roles if r is not Role.ENGINEER]
    rows = (
        await session.execute(
            select(Membership.user_id).where(
                Membership.company_id == company_id,
                Membership.status == "active",
                Membership.role.in_(roles),
            )
        )
    ).scalars()
    return list(rows)


async def notify(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    user_ids: Iterable[uuid.UUID | None],
    kind: str,
    params: dict[str, Any],
    link: str | None = None,
    exclude: uuid.UUID | None = None,
) -> int:
    """Notify members in-app and by email (each subject to the user's preferences).

    ``exclude`` is normally the actor: nobody needs a notification about what
    they just did themselves. Emails are queued until the transaction commits.
    """

    targets = {uid for uid in user_ids if uid is not None and uid != exclude}
    if not targets:
        return 0
    # Only people who are (still) active members of this company.
    users = (
        (
            await session.execute(
                select(User)
                .join(Membership, Membership.user_id == User.id)
                .where(
                    Membership.company_id == company_id,
                    Membership.status == "active",
                    User.id.in_(targets),
                    User.is_active.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    base = get_settings().APP_URL.rstrip("/")
    created = 0
    for user in users:
        if _enabled(user, "in_app", kind):
            session.add(
                Notification(
                    company_id=company_id, user_id=user.id, kind=kind, params=params, link=link
                )
            )
            created += 1
        if _enabled(user, "email", kind):
            mail = mail_templates.build(
                kind, user.locale, to=user.email, url=f"{base}{link}" if link else None, **params
            )
            outbox.after_commit(session, lambda m=mail: send_mail_async(m))  # type: ignore[misc]
    await session.flush()
    return created


def render(n: Notification, locale: str) -> tuple[str, str]:
    """(title, body) of a notification in the viewer's language."""

    try:
        _subject, heading, body, _button = mail_templates.texts(n.kind, locale, **(n.params or {}))
    except KeyError:  # unknown/retired kind: show something rather than fail the list
        return n.kind, ""
    return heading, body


async def list_for_user(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    unread_only: bool = False,
    limit: int = 30,
    before: datetime | None = None,
) -> list[Notification]:
    stmt = select(Notification).where(
        Notification.company_id == company_id, Notification.user_id == user_id
    )
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    if before is not None:
        stmt = stmt.where(Notification.created_at < before)
    stmt = stmt.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit)
    return list((await session.execute(stmt)).scalars().all())


async def unread_count(session: AsyncSession, *, company_id: uuid.UUID, user_id: uuid.UUID) -> int:
    return int(
        (
            await session.execute(
                select(func.count())
                .select_from(Notification)
                .where(
                    Notification.company_id == company_id,
                    Notification.user_id == user_id,
                    Notification.read_at.is_(None),
                )
            )
        ).scalar_one()
    )


async def mark_read(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    user_id: uuid.UUID,
    notification_id: uuid.UUID | None = None,
) -> int:
    """Mark one notification (or, with no id, all of them) as read."""

    stmt = (
        update(Notification)
        .where(
            Notification.company_id == company_id,
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
        )
        .values(read_at=datetime.now(UTC))
    )
    if notification_id is not None:
        stmt = stmt.where(Notification.id == notification_id)
    result = await session.execute(stmt)
    return int(result.rowcount or 0)  # type: ignore[attr-defined]
