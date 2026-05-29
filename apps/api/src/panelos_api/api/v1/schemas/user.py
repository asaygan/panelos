"""User schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field

from panelos_api.api.v1.schemas.common import ORMModel
from panelos_api.core.rbac import Role


class UserOut(ORMModel):
    id: uuid.UUID
    email: EmailStr
    name: str


class LocationRef(BaseModel):
    id: uuid.UUID
    code: str
    name: str


class MemberOut(ORMModel):
    id: uuid.UUID
    membership_id: uuid.UUID
    user_id: uuid.UUID
    role: Role
    email: EmailStr
    name: str
    status: str
    avatar_url: str | None = None
    last_active_at: datetime | None = None
    invited_at: datetime | None = None
    accepted_at: datetime | None = None
    assigned_locations: list[LocationRef] = Field(default_factory=list)


class InvitationIn(ORMModel):
    email: EmailStr
    role: Role
    location_ids: list[uuid.UUID] = Field(default_factory=list)
    message: str | None = None


class InvitationOut(ORMModel):
    id: uuid.UUID
    email: EmailStr
    role: Role
    token: str


class UserUpdateIn(ORMModel):
    name: str | None = None
    role: Role | None = None


class RoleChangeIn(BaseModel):
    role: Role


class StatusChangeIn(BaseModel):
    status: str


class LocationsAssignIn(BaseModel):
    location_ids: list[uuid.UUID] = Field(default_factory=list)


class PermissionOut(BaseModel):
    key: str
    label: str
    description: str


class RoleOut(BaseModel):
    role: Role
    label: str
    permissions: list[PermissionOut]
    member_count: int


class AuditLogOut(BaseModel):
    id: uuid.UUID
    action: str
    actor_name: str | None = None
    actor_email: str | None = None
    target_type: str
    target_id: str
    meta: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
