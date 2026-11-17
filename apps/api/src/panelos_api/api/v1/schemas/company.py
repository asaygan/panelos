"""Company schemas."""

import uuid

from panelos_api.api.v1.schemas.common import ORMModel


class CompanyOut(ORMModel):
    id: uuid.UUID
    name: str
    slug: str
    short_name: str | None = None
    standards_profile: str | None = None
    logo_key: str | None = None
    public_qr_access_enabled: bool = True
    default_locale: str = "tr"
    timezone: str = "Europe/Istanbul"
    require_four_eyes: bool = False
    engineer_can_approve: bool = True


class CompanyUpdateIn(ORMModel):
    name: str | None = None
    short_name: str | None = None
    standards_profile: str | None = None
    logo_key: str | None = None
    public_qr_access_enabled: bool | None = None
    default_locale: str | None = None
    timezone: str | None = None
    require_four_eyes: bool | None = None
    engineer_can_approve: bool | None = None


class LocationOut(ORMModel):
    id: uuid.UUID
    code: str
    name: str
    region: str | None = None


class LocationCreateIn(ORMModel):
    code: str
    name: str
    region: str | None = None


class LocationUpdateIn(ORMModel):
    code: str | None = None
    name: str | None = None
    region: str | None = None
