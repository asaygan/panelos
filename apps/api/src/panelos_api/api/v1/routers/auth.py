"""Auth routes."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pyotp
from fastapi import APIRouter, Cookie, Depends, Request, Response

from panelos_api.api.v1.schemas.auth import (
    AcceptInviteIn,
    InvitationInfoOut,
    LoginIn,
    LogoutIn,
    MeOut,
    MfaSetupOut,
    MfaVerifyIn,
    RefreshIn,
    TokenOut,
)
from panelos_api.config import get_settings
from panelos_api.core.exceptions import Unauthorized
from panelos_api.core.rate_limit import auth_limiter
from panelos_api.deps import CurrentUser, get_current_user, get_db
from panelos_api.repositories.membership_repo import MembershipRepo
from panelos_api.services import auth_service

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
        max_age=settings.ACCESS_TOKEN_TTL_MINUTES * 60,
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
async def bootstrap(
    request: Request, payload: LoginIn, db: AsyncSession = Depends(get_db)
) -> TokenOut:
    """One-time tenant bootstrap.

    Creates the initial company + Owner user when the database has no users.
    Subsequent calls fail with 409, so it is safe to leave deployed. Reuses
    LoginIn (email + password) — the company name is derived from the email
    domain.
    """
    from sqlalchemy import select

    from panelos_api.db.models.user import User

    has_user = (await db.execute(select(User.id).limit(1))).scalar_one_or_none()
    if has_user is not None:
        from panelos_api.core.exceptions import Conflict

        raise Conflict("bootstrap already completed: users exist")

    email = str(payload.email).lower()
    domain = email.split("@", 1)[1].split(".", 1)[0]
    company, _user, _m = await auth_service.signup_company_owner(
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
@auth_limiter.limit("10/minute")
async def login(
    request: Request, payload: LoginIn, db: AsyncSession = Depends(get_db)
) -> TokenOut:
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
    db: AsyncSession = Depends(get_db),
) -> TokenOut:
    # Body token (mobile/explicit) takes precedence; browsers rely on the cookie.
    token = (payload.refresh_token if payload else None) or panelos_refresh
    if not token:
        raise Unauthorized("missing refresh token")
    tokens = await auth_service.refresh_tokens(db, refresh_token=token)
    _set_auth_cookies(response, tokens)
    return TokenOut(access_token=tokens.access_token, refresh_token=tokens.refresh_token)


@router.get("/invitations/{token}", response_model=InvitationInfoOut)
async def get_invitation(token: str, db: AsyncSession = Depends(get_db)) -> InvitationInfoOut:
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
    request: Request, payload: AcceptInviteIn, db: AsyncSession = Depends(get_db)
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
    db: AsyncSession = Depends(get_db),
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
    db: AsyncSession = Depends(get_db),
) -> MeOut:
    memberships = await MembershipRepo(db).for_user(user.id)
    return MeOut(
        id=str(user.id),
        email=user.email,  # type: ignore[arg-type]
        name=user.name,
        companies=[{"id": str(m.company_id), "role": m.role.value} for m in memberships],
    )


@router.post("/mfa/setup", response_model=MfaSetupOut)
async def mfa_setup(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MfaSetupOut:
    from panelos_api.db.models.user import User

    secret = pyotp.random_base32()
    db_user = await db.get(User, user.id)
    if db_user is None:
        raise Unauthorized("user vanished")
    db_user.mfa_secret = secret
    await db.flush()
    otpauth = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="PanelOS")
    return MfaSetupOut(secret=secret, otpauth_url=otpauth)


@router.post("/mfa/verify")
async def mfa_verify(
    payload: MfaVerifyIn,
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    from panelos_api.db.models.user import User

    db_user = await db.get(User, user.id)
    if db_user is None or db_user.mfa_secret is None:
        raise Unauthorized("mfa not initialized")
    ok = pyotp.TOTP(db_user.mfa_secret).verify(payload.code)
    if not ok:
        raise Unauthorized("invalid code")
    return {"ok": True}
