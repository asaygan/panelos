"""Memberships."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import func, or_, select

from panelos_api.core.rbac import Role
from panelos_api.db.models.location import Location
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.membership_location_access import MembershipLocationAccess
from panelos_api.db.models.user import User
from panelos_api.repositories.base import BaseRepo

if TYPE_CHECKING:
    from sqlalchemy import Row


class MembershipRepo(BaseRepo[Membership]):
    model = Membership

    async def for_user(self, user_id: uuid.UUID) -> list[Membership]:
        rows = (
            await self.session.execute(select(Membership).where(Membership.user_id == user_id))
        ).scalars().all()
        return list(rows)

    async def for_user_in_company(
        self, user_id: uuid.UUID, company_id: uuid.UUID
    ) -> Membership | None:
        return (
            await self.session.execute(
                select(Membership).where(
                    Membership.user_id == user_id, Membership.company_id == company_id
                )
            )
        ).scalar_one_or_none()

    async def get_in_company(
        self, membership_id: uuid.UUID, company_id: uuid.UUID
    ) -> Membership | None:
        return (
            await self.session.execute(
                select(Membership).where(
                    Membership.id == membership_id, Membership.company_id == company_id
                )
            )
        ).scalar_one_or_none()

    async def list_members(
        self,
        company_id: uuid.UUID,
        *,
        search: str | None = None,
        role: Role | None = None,
        status: str | None = None,
        location_id: uuid.UUID | None = None,
    ) -> list[Row[tuple[Membership, User]]]:
        """Return (Membership, User) rows for a company with optional filters."""

        stmt = (
            select(Membership, User)
            .join(User, User.id == Membership.user_id)
            .where(Membership.company_id == company_id)
            .order_by(Membership.created_at.asc())
        )
        if search:
            pattern = f"%{search.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(User.name).like(pattern),
                    func.lower(User.email).like(pattern),
                )
            )
        if role is not None:
            stmt = stmt.where(Membership.role == role)
        if status:
            stmt = stmt.where(Membership.status == status)
        if location_id is not None:
            stmt = stmt.where(
                Membership.id.in_(
                    select(MembershipLocationAccess.membership_id).where(
                        MembershipLocationAccess.location_id == location_id
                    )
                )
            )
        rows = (await self.session.execute(stmt)).all()
        return list(rows)

    async def locations_for(
        self, membership_id: uuid.UUID
    ) -> list[Location]:
        """Return Location rows assigned to a membership."""

        stmt = (
            select(Location)
            .join(
                MembershipLocationAccess,
                MembershipLocationAccess.location_id == Location.id,
            )
            .where(MembershipLocationAccess.membership_id == membership_id)
            .order_by(Location.code.asc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def count_active_owners(self, company_id: uuid.UUID) -> int:
        return (
            await self.session.execute(
                select(func.count())
                .select_from(Membership)
                .where(
                    Membership.company_id == company_id,
                    Membership.role == Role.OWNER,
                    Membership.status == "active",
                )
            )
        ).scalar_one()

    async def count_by_role(self, company_id: uuid.UUID) -> dict[Role, int]:
        """Count active+invited memberships per role for a company."""

        rows = (
            await self.session.execute(
                select(Membership.role, func.count())
                .where(
                    Membership.company_id == company_id,
                    Membership.status.in_(("active", "invited")),
                )
                .group_by(Membership.role)
            )
        ).all()
        return dict(rows)
