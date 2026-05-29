"""Scan events."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from panelos_api.db.models.scan_event import ScanEvent
from panelos_api.repositories.base import BaseRepo

if TYPE_CHECKING:
    import uuid


class ScanRepo(BaseRepo[ScanEvent]):
    model = ScanEvent
    tenant_scoped = False

    async def for_panel(self, panel_id: uuid.UUID, limit: int = 50) -> list[ScanEvent]:
        rows = (
            await self.session.execute(
                select(ScanEvent)
                .where(ScanEvent.panel_id == panel_id)
                .order_by(ScanEvent.at.desc())
                .limit(limit)
            )
        ).scalars().all()
        return list(rows)
