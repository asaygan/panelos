"""Cross-tenant reference guards.

Any foreign key a client can put in a request body (location, system group, …)
must point at a row owned by the caller's company. Without this a member of
company A could attach their panel to company B's group and read B's hierarchy
back through the join.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import select

from panelos_api.core.exceptions import NotFound
from panelos_api.db.models.location import Location
from panelos_api.db.models.system_group import SystemGroup

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession

# request field -> (model, human label)
_REFS: dict[str, tuple[Any, str]] = {
    "location_id": (Location, "location"),
    "system_group_id": (SystemGroup, "system group"),
}


async def ensure_owned_refs(
    session: AsyncSession, *, company_id: uuid.UUID, values: dict[str, Any]
) -> None:
    """Raise 404 when a known FK in ``values`` targets another company's row."""

    for field, (model, label) in _REFS.items():
        ref_id = values.get(field)
        if ref_id is None:
            continue
        owned = (
            await session.execute(
                select(model.id).where(model.id == ref_id, model.company_id == company_id)
            )
        ).scalar_one_or_none()
        if owned is None:
            raise NotFound(f"{label} not found")
