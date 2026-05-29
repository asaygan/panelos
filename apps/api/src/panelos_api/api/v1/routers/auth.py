"""Auth routes."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pyotp
from fastapi import APIRouter, Depends

from panelos_api.api.v1.schemas.auth import (
    LoginIn,
    LogoutIn,
    MeOut,
    MfaSetupOut,
    MfaVerifyIn,
    RefreshIn,
    TokenOut,
)
from panelos_api.core.exceptions import Unauthorized
from panelos_api.deps import CurrentUser, get_current_user, get_db
from panelos_api.repositories.membership_repo import MembershipRepo
from panelos_api.services import auth_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    _, tokens = await auth_service.login(
        db,
        email=str(payload.email),
        password=payload.password,
        mfa_code=payload.mfa_code,
        device=payload.device,
    )
    return TokenOut(access_token=tokens.access_token, refresh_token=tokens.refresh_token)


@router.post("/refresh", response_model=TokenOut)
async def refresh(payload: RefreshIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    tokens = await auth_service.refresh_tokens(db, refresh_token=payload.refresh_token)
    return TokenOut(access_token=tokens.access_token, refresh_token=tokens.refresh_token)


@router.post("/logout")
async def logout(payload: LogoutIn, db: AsyncSession = Depends(get_db)) -> dict[str, bool]:
    await auth_service.logout(db, refresh_token=payload.refresh_token)
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
