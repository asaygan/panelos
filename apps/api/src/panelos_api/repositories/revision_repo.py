"""Panel revisions."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.repositories.base import BaseRepo

if TYPE_CHECKING:
    import uuid


class RevisionRepo(BaseRepo[PanelRevision]):
    model = PanelRevision
    tenant_scoped = False  # scoped via panel join when needed

    async def list_for_panel(self, panel_id: uuid.UUID) -> list[PanelRevision]:
        rows = (
            await self.session.execute(
                select(PanelRevision)
                .where(PanelRevision.panel_id == panel_id)
                .order_by(PanelRevision.revision_number.desc())
            )
        ).scalars().all()
        return list(rows)

    async def latest_number(self, panel_id: uuid.UUID) -> int:
        row = (
            await self.session.execute(
                select(PanelRevision.revision_number)
                .where(PanelRevision.panel_id == panel_id)
                .order_by(PanelRevision.revision_number.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        return int(row or 0)

    async def queue(
        self, *, statuses: list[RevisionStatus], limit: int = 100
    ) -> list[PanelRevision]:
        rows = (
            await self.session.execute(
                select(PanelRevision)
                .where(PanelRevision.status.in_(statuses))
                .order_by(PanelRevision.created_at.desc())
                .limit(limit)
            )
        ).scalars().all()
        return list(rows)
