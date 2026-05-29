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


class CompanyUpdateIn(ORMModel):
    name: str | None = None
    short_name: str | None = None
    standards_profile: str | None = None
    logo_key: str | None = None


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
