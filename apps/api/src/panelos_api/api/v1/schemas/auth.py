"""Auth schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    mfa_code: str | None = None
    device: str | None = None


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshIn(BaseModel):
    # Optional: browser clients send the refresh token via the httpOnly
    # `panelos_refresh` cookie instead of the body. Non-browser clients (mobile)
    # may still pass it explicitly.
    refresh_token: str | None = None


class LogoutIn(BaseModel):
    refresh_token: str | None = None


class MeCompany(BaseModel):
    id: str
    name: str
    role: str


class MeOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    locale: str = "tr"
    mfa_enabled: bool = False
    mfa_required: bool = False
    notification_prefs: dict[str, dict[str, bool]] = {}
    companies: list[MeCompany]
    # Resolved for the active company (X-Company-Id, else the default one).
    active_company_id: str | None = None
    role: str | None = None
    permissions: list[str] = []


class ProfileUpdateIn(BaseModel):
    name: str | None = None
    locale: str | None = None
    notification_prefs: dict[str, dict[str, bool]] | None = None


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


class MfaSetupOut(BaseModel):
    secret: str
    otpauth_url: str


class MfaVerifyIn(BaseModel):
    code: str


class MfaEnableOut(BaseModel):
    recovery_codes: list[str]


class MfaDisableIn(BaseModel):
    password: str


class InvitationInfoOut(BaseModel):
    email: EmailStr
    company_name: str
    role: str
    expired: bool
    accepted: bool


class AcceptInviteIn(BaseModel):
    token: str
    name: str | None = None
    password: str
