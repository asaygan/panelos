"""Companies."""

from __future__ import annotations

from sqlalchemy import select

from panelos_api.db.models.company import Company
from panelos_api.repositories.base import BaseRepo


class CompanyRepo(BaseRepo[Company]):
    model = Company
    tenant_scoped = False

    async def by_slug(self, slug: str) -> Company | None:
        return (
            await self.session.execute(select(Company).where(Company.slug == slug))
        ).scalar_one_or_none()
