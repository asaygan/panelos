"""Member + invitation + role endpoints."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Query, status

from panelos_api.api.v1.schemas.user import (
    InvitationIn,
    InvitationOut,
    LocationRef,
    LocationsAssignIn,
    MemberOut,
    PermissionOut,
    RoleChangeIn,
    RoleOut,
    StatusChangeIn,
)
from panelos_api.core.rbac import (
    PERMISSION_CATALOG,
    ROLE_CATALOG,
    ROLE_LABELS,
    Permission,
    Role,
)
from panelos_api.deps import CurrentMembership, get_current_membership, get_db, require_permission
from panelos_api.repositories.membership_repo import MembershipRepo
from panelos_api.services import membership_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/users", tags=["users"])

_PERMISSION_META = {key: (label, desc) for key, label, desc in PERMISSION_CATALOG}


@router.get("", response_model=list[MemberOut])
async def list_members(
    search: str | None = Query(default=None),
    role: Role | None = Query(default=None),
    member_status: str | None = Query(default=None, alias="status"),
    location_id: uuid.UUID | None = Query(default=None),
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[MemberOut]:
    repo = MembershipRepo(db)
    rows = await repo.list_members(
        m.company_id,
        search=search,
        role=role,
        status=member_status,
        location_id=location_id,
    )
    out: list[MemberOut] = []
    for mem, user in rows:
        locs = await repo.locations_for(mem.id)
        out.append(
            MemberOut(
                id=mem.id,
                membership_id=mem.id,
                user_id=user.id,
                role=mem.role,
                email=user.email,
                name=user.name,
                status=mem.status,
                avatar_url=user.avatar_url,
                last_active_at=mem.last_active_at,
                invited_at=mem.invited_at,
                accepted_at=mem.accepted_at,
                assigned_locations=[
                    LocationRef(id=loc.id, code=loc.code, name=loc.name) for loc in locs
                ],
            )
        )
    return out


@router.post(
    "/invitations", response_model=InvitationOut, status_code=status.HTTP_201_CREATED
)
async def invite(
    payload: InvitationIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
) -> InvitationOut:
    inv = await membership_service.invite(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        actor_role=m.role,
        email=str(payload.email),
        role=payload.role,
        location_ids=payload.location_ids,
        message=payload.message,
    )
    return InvitationOut.model_validate(inv)


@router.patch("/{membership_id}/role", status_code=status.HTTP_200_OK)
async def change_role(
    membership_id: uuid.UUID,
    payload: RoleChangeIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    mem = await membership_service.change_role(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        actor_role=m.role,
        membership_id=membership_id,
        new_role=payload.role,
    )
    return {"id": str(mem.id), "role": mem.role.value}


@router.patch("/{membership_id}/status", status_code=status.HTTP_200_OK)
async def change_status(
    membership_id: uuid.UUID,
    payload: StatusChangeIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    mem = await membership_service.change_status(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        actor_role=m.role,
        membership_id=membership_id,
        new_status=payload.status,
    )
    return {"id": str(mem.id), "status": mem.status}


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    membership_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await membership_service.remove(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        actor_role=m.role,
        membership_id=membership_id,
    )


@router.post("/{membership_id}/resend-invitation", response_model=InvitationOut)
async def resend_invitation(
    membership_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
) -> InvitationOut:
    inv = await membership_service.resend_invite(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        membership_id=membership_id,
    )
    return InvitationOut.model_validate(inv)


@router.put("/{membership_id}/locations", status_code=status.HTTP_200_OK)
async def assign_locations(
    membership_id: uuid.UUID,
    payload: LocationsAssignIn,
    m: CurrentMembership = Depends(require_permission(Permission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, list[str]]:
    mem = await membership_service.assign_locations(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        actor_role=m.role,
        membership_id=membership_id,
        location_ids=payload.location_ids,
    )
    locs = await MembershipRepo(db).locations_for(mem.id)
    return {"location_ids": [str(loc.id) for loc in locs]}


roles_router = APIRouter(tags=["roles"])


@roles_router.get("/roles", response_model=list[RoleOut])
async def list_roles(
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
) -> list[RoleOut]:
    counts = await MembershipRepo(db).count_by_role(m.company_id)
    out: list[RoleOut] = []
    for role in Role:
        keys = ROLE_CATALOG.get(role, [])
        perms = [
            PermissionOut(
                key=key,
                label=_PERMISSION_META[key][0],
                description=_PERMISSION_META[key][1],
            )
            for key in keys
        ]
        out.append(
            RoleOut(
                role=role,
                label=ROLE_LABELS[role],
                permissions=perms,
                member_count=counts.get(role, 0),
            )
        )
    return out
