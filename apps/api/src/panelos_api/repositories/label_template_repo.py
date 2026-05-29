"""Label templates (tenant-scoped)."""

from __future__ import annotations

from sqlalchemy import select, update

from panelos_api.db.models.label_template import LabelTemplate
from panelos_api.repositories.base import BaseRepo


class LabelTemplateRepo(BaseRepo[LabelTemplate]):
    model = LabelTemplate

    async def list_all(self) -> list[LabelTemplate]:
        stmt = self._scope(select(LabelTemplate)).order_by(LabelTemplate.created_at.desc())
        rows = (await self.session.execute(stmt)).scalars().all()
        return list(rows)

    async def clear_defaults(self) -> None:
        """Unset ``is_default`` on every template in the tenant."""
        await self.session.execute(
            update(LabelTemplate)
            .where(LabelTemplate.company_id == self.company_id)
            .values(is_default=False)
        )

    async def set_default(self, template: LabelTemplate) -> LabelTemplate:
        await self.clear_defaults()
        template.is_default = True
        await self.session.flush()
        return template
