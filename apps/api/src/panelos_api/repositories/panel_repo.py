"""Panels."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import or_, select

from panelos_api.db.models.panel import Panel
from panelos_api.db.models.project import Project
from panelos_api.db.models.system_group import SystemGroup
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
        q: str | None = None,
        include_archived: bool = False,
        limit: int = 100,
        cursor: uuid.UUID | None = None,
    ) -> list[Panel]:
        stmt = self._scope(select(Panel))
        if not include_archived:
            # Same visibility as the tree: hide archived panels and everything
            # that lives under an archived project.
            archived_groups = (
                select(SystemGroup.id)
                .join(Project, Project.id == SystemGroup.project_id)
                .where(Project.archived_at.is_not(None))
            )
            stmt = stmt.where(
                Panel.archived_at.is_(None),
                or_(Panel.system_group_id.is_(None), Panel.system_group_id.not_in(archived_groups)),
            )
        if location_id is not None:
            stmt = stmt.where(Panel.location_id == location_id)
        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                or_(Panel.tag.ilike(like), Panel.name.ilike(like), Panel.serial.ilike(like))
            )
        if cursor is not None:
            stmt = stmt.where(Panel.id > cursor)
        stmt = stmt.order_by(Panel.id.asc()).limit(limit)
        return list((await self.session.execute(stmt)).scalars().all())
