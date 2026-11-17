"""Shared panel lookups + location-scoped visibility.

A membership can be restricted to a set of locations
(``membership_location_access``). A restricted member only sees panels at
those locations; members with no rows see everything in the company.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Role
from panelos_api.db.models.membership_location_access import MembershipLocationAccess
from panelos_api.db.models.panel import Panel

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.deps import CurrentMembership


async def allowed_location_ids(
    session: AsyncSession, m: CurrentMembership
) -> set[uuid.UUID] | None:
    """Locations the member is limited to, or ``None`` when unrestricted."""

    # Owners and admins administer the whole organization; restrictions are
    # for field/engineering roles.
    if m.membership_id is None or m.role in (Role.OWNER, Role.ADMIN):
        return None
    rows = (
        (
            await session.execute(
                select(MembershipLocationAccess.location_id).where(
                    MembershipLocationAccess.membership_id == m.membership_id
                )
            )
        )
        .scalars()
        .all()
    )
    return set(rows) or None


def restrict_panels(stmt: Any, allowed: set[uuid.UUID] | None) -> Any:
    """Apply the location restriction to a statement that selects from ``Panel``."""

    if allowed is None:
        return stmt
    return stmt.where(Panel.location_id.in_(allowed))


async def get_panel(session: AsyncSession, m: CurrentMembership, panel_id: uuid.UUID) -> Panel:
    """Load a panel the member is allowed to see, or raise 404."""

    panel = (
        await session.execute(
            select(Panel).where(Panel.id == panel_id, Panel.company_id == m.company_id)
        )
    ).scalar_one_or_none()
    if panel is None:
        raise NotFound("panel not found")
    allowed = await allowed_location_ids(session, m)
    if allowed is not None and panel.location_id not in allowed:
        raise NotFound("panel not found")
    return panel
