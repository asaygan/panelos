"""Users."""

from __future__ import annotations

from sqlalchemy import select

from panelos_api.db.models.user import User
from panelos_api.repositories.base import BaseRepo


class UserRepo(BaseRepo[User]):
    model = User
    tenant_scoped = False

    async def by_email(self, email: str) -> User | None:
        return (
            await self.session.execute(select(User).where(User.email == email.lower()))
        ).scalar_one_or_none()
