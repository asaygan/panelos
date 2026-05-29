"""Generic tenant-scoped CRUD with cursor pagination."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, TypeVar, cast

from sqlalchemy import select

from panelos_api.db.base import Base

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession

TModel = TypeVar("TModel", bound=Base)


class BaseRepo[TModel: Base]:
    """Common DB access pattern for tenant-scoped aggregates.

    Subclasses set ``model`` and ``tenant_scoped`` (True for company-rooted tables).
    """

    model: type[TModel]
    tenant_scoped: bool = True

    def __init__(self, session: AsyncSession, company_id: uuid.UUID | None = None) -> None:
        self.session = session
        self.company_id = company_id

    def _scope(self, stmt: Any) -> Any:
        if self.tenant_scoped and self.company_id is not None:
            stmt = stmt.where(self.model.company_id == self.company_id)  # type: ignore[attr-defined]
        return stmt

    async def get(self, obj_id: uuid.UUID) -> TModel | None:
        stmt = self._scope(select(self.model).where(self.model.id == obj_id))  # type: ignore[attr-defined]
        return cast("TModel | None", (await self.session.execute(stmt)).scalar_one_or_none())

    async def list(self, *, limit: int = 50, cursor: uuid.UUID | None = None) -> list[TModel]:
        stmt = self._scope(select(self.model)).order_by(self.model.id.asc())  # type: ignore[attr-defined]
        if cursor is not None:
            stmt = stmt.where(self.model.id > cursor)  # type: ignore[attr-defined]
        stmt = stmt.limit(limit)
        rows = (await self.session.execute(stmt)).scalars().all()
        return list(rows)

    async def add(self, obj: TModel) -> TModel:
        self.session.add(obj)
        await self.session.flush()
        return obj

    async def delete(self, obj: TModel) -> None:
        await self.session.delete(obj)
        await self.session.flush()
