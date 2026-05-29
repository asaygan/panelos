"""ILIKE-based search for the command palette."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import or_, select

from panelos_api.db.models.panel import Panel

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.ext.asyncio import AsyncSession


async def search(session: AsyncSession, *, company_id: uuid.UUID, q: str, limit: int = 20) -> list[dict[str, Any]]:
    if not q:
        return []
    like = f"%{q}%"
    rows = (
        await session.execute(
            select(Panel)
            .where(Panel.company_id == company_id)
            .where(or_(Panel.tag.ilike(like), Panel.name.ilike(like), Panel.serial.ilike(like)))
            .limit(limit)
        )
    ).scalars().all()
    return [
        {"type": "panel", "id": str(p.id), "tag": p.tag, "name": p.name, "serial": p.serial}
        for p in rows
    ]
