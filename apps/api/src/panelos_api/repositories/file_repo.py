"""PDF files."""

from __future__ import annotations

from sqlalchemy import select

from panelos_api.db.models.pdf_file import PdfFile
from panelos_api.repositories.base import BaseRepo


class FileRepo(BaseRepo[PdfFile]):
    model = PdfFile

    async def by_storage_key(self, key: str) -> PdfFile | None:
        stmt = self._scope(select(PdfFile).where(PdfFile.storage_key == key))
        return (await self.session.execute(stmt)).scalar_one_or_none()
