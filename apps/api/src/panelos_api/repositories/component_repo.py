"""Components."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from panelos_api.db.models.component import Component
from panelos_api.repositories.base import BaseRepo

if TYPE_CHECKING:
    import uuid


class ComponentRepo(BaseRepo[Component]):
    model = Component
    tenant_scoped = False

    async def for_revision(self, revision_id: uuid.UUID) -> list[Component]:
        rows = (
            await self.session.execute(
                select(Component)
                .where(Component.revision_id == revision_id)
                .order_by(Component.slot.asc())
            )
        ).scalars().all()
        return list(rows)

    async def create(self, **kwargs: object) -> Component:
        comp = Component(**kwargs)
        self.session.add(comp)
        await self.session.flush()
        return comp

    async def bulk_create(self, rows: list[dict[str, object]]) -> list[Component]:
        comps = [Component(**row) for row in rows]
        self.session.add_all(comps)
        await self.session.flush()
        return comps

    async def update(self, comp: Component, changes: dict[str, object]) -> Component:
        for k, v in changes.items():
            setattr(comp, k, v)
        await self.session.flush()
        return comp

    async def delete(self, comp: Component) -> None:
        await self.session.delete(comp)
        await self.session.flush()
