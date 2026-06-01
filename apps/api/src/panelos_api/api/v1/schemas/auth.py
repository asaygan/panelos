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
    refresh_token: str


class LogoutIn(BaseModel):
    refresh_token: str


class MeOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    companies: list[dict[str, str]]


class MfaSetupOut(BaseModel):
    secret: str
    otpauth_url: str


class MfaVerifyIn(BaseModel):
    code: str


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
