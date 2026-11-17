"""Self-service account security: password reset/change, MFA, profile."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

import pyotp
from sqlalchemy import select, update

from panelos_api.config import get_settings
from panelos_api.core import crypto, mail_templates, outbox
from panelos_api.core.audit import append_audit
from panelos_api.core.email import send_mail_async
from panelos_api.core.exceptions import Conflict, Unauthorized, ValidationFailed
from panelos_api.core.i18n import SUPPORTED_LOCALES, normalize_locale
from panelos_api.core.security import hash_password, verify_password
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.password_reset import PasswordResetToken
from panelos_api.db.models.session import UserSession
from panelos_api.db.models.user import User

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession

MIN_PASSWORD_LENGTH = 10
RECOVERY_CODE_COUNT = 10


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def validate_password(password: str) -> None:
    """Minimal strength policy: length + not purely one character class."""

    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValidationFailed(
            f"password must be at least {MIN_PASSWORD_LENGTH} characters",
            code="weak_password",
        )
    if password.isdigit() or password.isalpha():
        raise ValidationFailed(
            "password must mix letters with digits or symbols", code="weak_password"
        )


async def _audit_for_user(
    session: AsyncSession, user: User, action: AuditAction, meta: dict[str, Any] | None = None
) -> None:
    """Write the event into every company the user is an active member of."""

    company_ids = (
        (
            await session.execute(
                select(Membership.company_id).where(
                    Membership.user_id == user.id, Membership.status == "active"
                )
            )
        )
        .scalars()
        .all()
    )
    for company_id in company_ids:
        await append_audit(
            session,
            company_id=company_id,
            actor_id=user.id,
            action=action,
            target_type="user",
            target_id=str(user.id),
            meta=meta or {},
        )


async def revoke_all_sessions(
    session: AsyncSession, user_id: uuid.UUID, *, except_family: uuid.UUID | None = None
) -> None:
    stmt = (
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC), rotated_at=None)
    )
    if except_family is not None:
        stmt = stmt.where(UserSession.family_id != except_family)
    await session.execute(stmt)


# ---------------------------------------------------------------------------
# Password reset / change
# ---------------------------------------------------------------------------


async def request_password_reset(session: AsyncSession, *, email: str) -> None:
    """Email a one-time reset link. Silently does nothing for unknown addresses
    so the endpoint can't be used to discover which emails have accounts."""

    user = (
        await session.execute(select(User).where(User.email == email.strip().lower()))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        return

    settings = get_settings()
    token = secrets.token_urlsafe(32)
    # A new request invalidates earlier unused links.
    await session.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None))
        .values(used_at=datetime.now(UTC))
    )
    session.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=_sha(token),
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.PASSWORD_RESET_TTL_MINUTES),
        )
    )
    await session.flush()
    await _audit_for_user(session, user, AuditAction.PASSWORD_RESET_REQUESTED)

    mail = mail_templates.build(
        "password_reset",
        user.locale,
        to=user.email,
        url=f"{settings.APP_URL.rstrip('/')}/reset-password?token={token}",
        minutes=settings.PASSWORD_RESET_TTL_MINUTES,
    )
    outbox.after_commit(session, lambda: send_mail_async(mail))


async def _password_changed(session: AsyncSession, user: User, *, keep: uuid.UUID | None) -> None:
    user.password_changed_at = datetime.now(UTC)
    await revoke_all_sessions(session, user.id, except_family=keep)
    await _audit_for_user(session, user, AuditAction.PASSWORD_CHANGED)
    settings = get_settings()
    mail = mail_templates.build(
        "password_changed",
        user.locale,
        to=user.email,
        url=f"{settings.APP_URL.rstrip('/')}/forgot-password",
    )
    outbox.after_commit(session, lambda: send_mail_async(mail))


async def reset_password(session: AsyncSession, *, token: str, new_password: str) -> None:
    validate_password(new_password)
    row = (
        await session.execute(
            select(PasswordResetToken)
            .where(PasswordResetToken.token_hash == _sha(token))
            .with_for_update()
        )
    ).scalar_one_or_none()
    now = datetime.now(UTC)
    if row is None or row.used_at is not None or row.expires_at < now:
        raise ValidationFailed("reset link is invalid or has expired", code="invalid_reset_token")
    user = await session.get(User, row.user_id)
    if user is None or not user.is_active:
        raise ValidationFailed("reset link is invalid or has expired", code="invalid_reset_token")
    row.used_at = now
    user.password_hash = hash_password(new_password)
    await _password_changed(session, user, keep=None)
    await session.flush()


async def change_password(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    current_password: str,
    new_password: str,
    keep_family: uuid.UUID | None = None,
) -> None:
    user = await session.get(User, user_id)
    if (
        user is None
        or user.password_hash is None
        or not verify_password(current_password, user.password_hash)
    ):
        raise Unauthorized("current password is incorrect", code="wrong_password")
    validate_password(new_password)
    if verify_password(new_password, user.password_hash):
        raise ValidationFailed(
            "new password must differ from the current one", code="same_password"
        )
    user.password_hash = hash_password(new_password)
    await _password_changed(session, user, keep=keep_family)
    await session.flush()


# ---------------------------------------------------------------------------
# MFA (TOTP)
# ---------------------------------------------------------------------------


def _totp(user: User) -> pyotp.TOTP | None:
    if not user.mfa_secret:
        return None
    return pyotp.TOTP(crypto.decrypt(user.mfa_secret))


def verify_mfa_code(user: User, code: str) -> bool:
    """Accept a current TOTP code, or consume a one-time recovery code."""

    cleaned = code.strip().replace(" ", "").replace("-", "")
    totp = _totp(user)
    if totp is not None and cleaned.isdigit() and totp.verify(cleaned, valid_window=1):
        return True
    digest = _sha(cleaned.lower())
    codes = list(user.mfa_recovery_codes or [])
    if digest in codes:
        codes.remove(digest)
        user.mfa_recovery_codes = codes  # reassign so the JSONB change is tracked
        return True
    return False


async def mfa_begin(session: AsyncSession, *, user_id: uuid.UUID) -> tuple[str, str]:
    """Create a pending secret. MFA is NOT active until :func:`mfa_enable` confirms a code."""

    user = await session.get(User, user_id)
    if user is None:
        raise Unauthorized("user not found")
    if user.mfa_enabled:
        raise Conflict("two-factor authentication is already enabled", code="mfa_already_enabled")
    secret = pyotp.random_base32()
    user.mfa_secret = crypto.encrypt(secret)
    await session.flush()
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="PanelOS")
    return secret, uri


async def mfa_enable(session: AsyncSession, *, user_id: uuid.UUID, code: str) -> list[str]:
    """Confirm the pending secret with a code; returns one-time recovery codes."""

    user = await session.get(User, user_id)
    totp = _totp(user) if user else None
    if user is None or totp is None:
        raise Conflict("start two-factor setup first", code="mfa_not_started")
    if user.mfa_enabled:
        raise Conflict("two-factor authentication is already enabled", code="mfa_already_enabled")
    if not totp.verify(code.strip().replace(" ", ""), valid_window=1):
        raise ValidationFailed("the code is not valid", code="invalid_mfa_code")
    plain = [
        f"{secrets.token_hex(2)}-{secrets.token_hex(2)}-{secrets.token_hex(2)}"
        for _ in range(RECOVERY_CODE_COUNT)
    ]
    user.mfa_recovery_codes = [_sha(c.replace("-", "")) for c in plain]
    user.mfa_enabled = True
    await _audit_for_user(session, user, AuditAction.MFA_ENABLED)
    await session.flush()
    return plain


async def mfa_disable(session: AsyncSession, *, user_id: uuid.UUID, password: str) -> None:
    if get_settings().MFA_REQUIRED:
        raise Conflict(
            "two-factor authentication is required by your organization", code="mfa_required"
        )
    user = await session.get(User, user_id)
    if (
        user is None
        or user.password_hash is None
        or not verify_password(password, user.password_hash)
    ):
        raise Unauthorized("password is incorrect", code="wrong_password")
    user.mfa_secret = None
    user.mfa_enabled = False
    user.mfa_recovery_codes = []
    await _audit_for_user(session, user, AuditAction.MFA_DISABLED)
    await session.flush()


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------


async def update_profile(
    session: AsyncSession,
    *,
    user_id: uuid.UUID,
    name: str | None = None,
    locale: str | None = None,
    notification_prefs: dict[str, Any] | None = None,
) -> User:
    user = await session.get(User, user_id)
    if user is None:
        raise Unauthorized("user not found")
    if name is not None:
        cleaned = name.strip()
        if not cleaned:
            raise ValidationFailed("name cannot be empty")
        user.name = cleaned[:200]
    if locale is not None:
        if normalize_locale(locale, "") not in SUPPORTED_LOCALES:
            raise ValidationFailed(f"unsupported locale: {locale}", code="unsupported_locale")
        user.locale = normalize_locale(locale)
    if notification_prefs is not None:
        user.notification_prefs = {
            channel: {str(k): bool(v) for k, v in (notification_prefs.get(channel) or {}).items()}
            for channel in ("email", "in_app")
        }
    await session.flush()
    return user
