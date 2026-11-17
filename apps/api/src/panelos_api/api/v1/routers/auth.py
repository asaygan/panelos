"""Auth routes."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter, Cookie, Depends, Header, Request, Response

from panelos_api.api.v1.schemas.auth import (
    AcceptInviteIn,
    ChangePasswordIn,
    ForgotPasswordIn,
    InvitationInfoOut,
    LoginIn,
    LogoutIn,
    MeCompany,
    MeOut,
    MfaDisableIn,
    MfaEnableOut,
    MfaSetupOut,
    MfaVerifyIn,
    ProfileUpdateIn,
    RefreshIn,
    ResetPasswordIn,
    TokenOut,
)
from panelos_api.config import get_settings
from panelos_api.core.exceptions import Unauthorized
from panelos_api.core.rate_limit import auth_limiter, enforce
from panelos_api.deps import CurrentUser, get_current_user, get_system_db
from panelos_api.services import account_service, auth_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.services.auth_service import TokenPair

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_COOKIE = "panelos_session"
REFRESH_COOKIE = "panelos_refresh"
COMPANY_COOKIE = "panelos_company"


def _set_auth_cookies(response: Response, tokens: TokenPair) -> None:
    """Mirror the Next.js server-action cookies so browser refresh is self-contained.

    The browser never sees the tokens in JS (httpOnly); a 401-triggered POST to
    /auth/refresh rotates both cookies here so the session continues seamlessly.
    """
    settings = get_settings()
    secure = settings.APP_ENV in ("production", "staging")
    response.set_cookie(
        SESSION_COOKIE,
        tokens.access_token,
        # Outlives the JWT on purpose: an expired-but-present cookie lets the web
        # middleware tell "refreshable" from "signed out" (see web lib/auth/cookies).
        max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE,
        tokens.refresh_token,
        max_age=settings.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


@router.post("/bootstrap", response_model=TokenOut)
@auth_limiter.limit("5/minute")
async def bootstrap(
    request: Request, payload: LoginIn, db: AsyncSession = Depends(get_system_db)
) -> TokenOut:
    """One-time tenant bootstrap.

    Creates the initial company + Owner user when the database has no users.
    Gated behind ``BOOTSTRAP_ENABLED`` (off by default) and rate limited; once a
    user exists every call fails with 409. Reuses
    LoginIn (email + password) — the company name is derived from the email
    domain.
    """
    from sqlalchemy import select, text

    from panelos_api.core.exceptions import NotFound
    from panelos_api.db.models.user import User

    if not get_settings().BOOTSTRAP_ENABLED:
        # Indistinguishable from an unknown route unless explicitly enabled.
        raise NotFound("not found")

    # Serialize concurrent bootstraps so two callers can't both see "no users".
    await db.execute(text("SELECT pg_advisory_xact_lock(hashtext('panelos.bootstrap'))"))
    has_user = (await db.execute(select(User.id).limit(1))).scalar_one_or_none()
    if has_user is not None:
        from panelos_api.core.exceptions import Conflict

        raise Conflict("bootstrap already completed: users exist")

    email = str(payload.email).lower()
    domain = email.split("@", 1)[1].split(".", 1)[0]
    _company, _user, _m = await auth_service.signup_company_owner(
        db,
        company_name=domain.title(),
        company_slug=domain.lower(),
        owner_email=email,
        owner_name=email.split("@", 1)[0].title(),
        password=payload.password,
    )
    await db.commit()
    _, tokens = await auth_service.login(
        db, email=email, password=payload.password, mfa_code=None, device=None
    )
    return TokenOut(access_token=tokens.access_token, refresh_token=tokens.refresh_token)


@router.post("/login", response_model=TokenOut)
@auth_limiter.limit("120/minute")
async def login(
    request: Request, payload: LoginIn, db: AsyncSession = Depends(get_system_db)
) -> TokenOut:
    # Brute-force guard keyed by the account under attack (see core/rate_limit).
    enforce("login", str(payload.email).lower(), "10/minute")
    _, tokens = await auth_service.login(
        db,
        email=str(payload.email),
        password=payload.password,
        mfa_code=payload.mfa_code,
        device=payload.device,
    )
    return TokenOut(access_token=tokens.access_token, refresh_token=tokens.refresh_token)


@router.post("/refresh", response_model=TokenOut)
@auth_limiter.limit("30/minute")
async def refresh(
    request: Request,
    response: Response,
    payload: RefreshIn | None = None,
    panelos_refresh: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_system_db),
) -> TokenOut:
    # Body token (mobile/explicit) takes precedence; browsers rely on the cookie.
    token = (payload.refresh_token if payload else None) or panelos_refresh
    if not token:
        raise Unauthorized("missing refresh token")
    tokens = await auth_service.refresh_tokens(db, refresh_token=token)
    _set_auth_cookies(response, tokens)
    return TokenOut(access_token=tokens.access_token, refresh_token=tokens.refresh_token)


@router.get("/invitations/{token}", response_model=InvitationInfoOut)
async def get_invitation(
    token: str, db: AsyncSession = Depends(get_system_db)
) -> InvitationInfoOut:
    """Public: resolve an invitation token for the accept page."""
    info = await auth_service.get_invitation(db, token=token)
    return InvitationInfoOut(
        email=info.email,  # type: ignore[arg-type]
        company_name=info.company_name,
        role=info.role,
        expired=info.expired,
        accepted=info.accepted,
    )


@router.post("/accept-invite", response_model=TokenOut)
@auth_limiter.limit("10/minute")
async def accept_invite(
    request: Request, payload: AcceptInviteIn, db: AsyncSession = Depends(get_system_db)
) -> TokenOut:
    """Public: set password + activate membership from an invite token (auto-login)."""
    _, _, tokens = await auth_service.accept_invite(
        db, token=payload.token, name=payload.name, password=payload.password
    )
    return TokenOut(access_token=tokens.access_token, refresh_token=tokens.refresh_token)


@router.post("/logout")
async def logout(
    response: Response,
    payload: LogoutIn | None = None,
    panelos_refresh: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_system_db),
) -> dict[str, bool]:
    token = (payload.refresh_token if payload else None) or panelos_refresh
    if token:
        await auth_service.logout(db, refresh_token=token)
    # Clear the auth cookies regardless so the browser session ends.
    for name in (SESSION_COOKIE, REFRESH_COOKIE, COMPANY_COOKIE):
        response.delete_cookie(name, path="/")
    return {"ok": True}


@router.get("/me", response_model=MeOut)
async def me(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_system_db),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> MeOut:
    return await _me(db, user, x_company_id)


async def _me(db: AsyncSession, user: CurrentUser, x_company_id: str | None) -> MeOut:
    from sqlalchemy import select

    from panelos_api.core.rbac import permissions_for
    from panelos_api.db.models.company import Company
    from panelos_api.db.models.membership import Membership
    from panelos_api.db.models.user import User

    rows = (
        await db.execute(
            select(Membership, Company)
            .join(Company, Company.id == Membership.company_id)
            .where(Membership.user_id == user.id, Membership.status == "active")
            .order_by(Membership.created_at)
        )
    ).all()
    active = next((m for m, _c in rows if str(m.company_id) == (x_company_id or "")), None)
    if active is None and rows:
        active = rows[0][0]
    db_user = await db.get(User, user.id)
    return MeOut(
        id=str(user.id),
        email=user.email,  # type: ignore[arg-type]
        name=user.name,
        locale=user.locale,
        mfa_enabled=user.mfa_enabled,
        mfa_required=get_settings().MFA_REQUIRED,
        notification_prefs=(db_user.notification_prefs if db_user else {}) or {},
        companies=[
            MeCompany(id=str(m.company_id), name=c.name, role=m.role.value) for m, c in rows
        ],
        active_company_id=str(active.company_id) if active else None,
        role=active.role.value if active else None,
        permissions=permissions_for(active.role) if active else [],
    )


@router.patch("/me", response_model=MeOut)
async def update_me(
    payload: ProfileUpdateIn,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_system_db),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> MeOut:
    updated = await account_service.update_profile(
        db, user_id=user.id, **payload.model_dump(exclude_unset=True)
    )
    user.name, user.locale = updated.name, updated.locale
    return await _me(db, user, x_company_id)


@router.post("/forgot-password", status_code=202)
@auth_limiter.limit("10/minute")
async def forgot_password(
    request: Request, payload: ForgotPasswordIn, db: AsyncSession = Depends(get_system_db)
) -> dict[str, bool]:
    """Always 202, whether or not the address has an account (no enumeration)."""
    enforce("forgot-password", str(payload.email).lower(), "3/hour")
    await account_service.request_password_reset(db, email=str(payload.email))
    return {"ok": True}


@router.post("/reset-password")
@auth_limiter.limit("10/minute")
async def reset_password(
    request: Request, payload: ResetPasswordIn, db: AsyncSession = Depends(get_system_db)
) -> dict[str, bool]:
    await account_service.reset_password(db, token=payload.token, new_password=payload.password)
    return {"ok": True}


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordIn,
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    panelos_refresh: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_system_db),
) -> dict[str, bool]:
    """Change the password and sign out every other session of this user."""
    enforce("change-password", str(user.id), "10/hour")
    keep = await auth_service.family_of(db, panelos_refresh) if panelos_refresh else None
    await account_service.change_password(
        db,
        user_id=user.id,
        current_password=payload.current_password,
        new_password=payload.new_password,
        keep_family=keep,
    )
    return {"ok": True}


@router.post("/logout-all")
async def logout_all(
    response: Response,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_system_db),
) -> dict[str, bool]:
    """Sign out everywhere (all devices)."""
    await account_service.revoke_all_sessions(db, user.id)
    for name in (SESSION_COOKIE, REFRESH_COOKIE, COMPANY_COOKIE):
        response.delete_cookie(name, path="/")
    return {"ok": True}


@router.post("/mfa/setup", response_model=MfaSetupOut)
async def mfa_setup(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_system_db),
) -> MfaSetupOut:
    """Start enrolment: returns a secret/QR. MFA stays off until /mfa/enable."""
    secret, uri = await account_service.mfa_begin(db, user_id=user.id)
    return MfaSetupOut(secret=secret, otpauth_url=uri)


@router.post("/mfa/enable", response_model=MfaEnableOut)
async def mfa_enable(
    payload: MfaVerifyIn,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_system_db),
) -> MfaEnableOut:
    """Confirm enrolment with a code from the authenticator app."""
    enforce("mfa-enable", str(user.id), "10/minute")
    codes = await account_service.mfa_enable(db, user_id=user.id, code=payload.code)
    return MfaEnableOut(recovery_codes=codes)


@router.post("/mfa/disable")
async def mfa_disable(
    payload: MfaDisableIn,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_system_db),
) -> dict[str, bool]:
    enforce("mfa-disable", str(user.id), "10/hour")
    await account_service.mfa_disable(db, user_id=user.id, password=payload.password)
    return {"ok": True}
