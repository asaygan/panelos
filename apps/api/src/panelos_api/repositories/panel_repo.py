"""Panels."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import func, or_, select

from panelos_api.db.models.panel import Panel
from panelos_api.repositories.base import BaseRepo

if TYPE_CHECKING:
    import uuid


class PanelRepo(BaseRepo[Panel]):
    model = Panel

    async def by_qr_token(self, token: str) -> Panel | None:
        return (
            await self.session.execute(select(Panel).where(Panel.qr_token == token))
        ).scalar_one_or_none()

    async def list_filtered(
        self,
        *,
        location_id: uuid.UUID | None = None,
        status: str | None = None,
        q: str | None = None,
        limit: int = 100,
        cursor: uuid.UUID | None = None,
    ) -> list[Panel]:
        stmt = self._scope(select(Panel))
        if location_id is not None:
            stmt = stmt.where(Panel.location_id == location_id)
        if status is not None:
            stmt = stmt.where(Panel.status == status)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                or_(Panel.tag.ilike(like), Panel.name.ilike(like), Panel.serial.ilike(like))
            )
        if cursor is not None:
            stmt = stmt.where(Panel.id > cursor)
        stmt = stmt.order_by(Panel.id.asc()).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all())

    async def count_by_status(self) -> dict[str, int]:
        stmt = self._scope(select(Panel.status, func.count()).group_by(Panel.status))
        rows = (await self.session.execute(stmt)).all()
        return {str(s): int(c) for s, c in rows}
