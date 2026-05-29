"""File upload + retrieval orchestration."""

from __future__ import annotations

import hashlib
import uuid
from typing import TYPE_CHECKING, BinaryIO

from panelos_api.core.audit import append_audit
from panelos_api.core.exceptions import Conflict, NotFound
from panelos_api.db.models.audit_log import AuditAction
from panelos_api.db.models.pdf_file import PdfFile
from panelos_api.db.models.revision_file import RevisionFile

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.storage.base import StorageProvider


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


async def upload_blob(
    session: AsyncSession,
    *,
    company_id: uuid.UUID,
    actor_id: uuid.UUID,
    storage: StorageProvider,
    fileobj: BinaryIO,
    filename: str,
    content_type: str,
    storage_provider_name: str,
) -> PdfFile:
    """Upload bytes and register a ``PdfFile``."""

    obj = await storage.put(f"files/{uuid.uuid4()}/{filename}", fileobj, content_type)
    record = PdfFile(
        company_id=company_id,
        storage_provider=storage_provider_name,
        storage_key=obj.key,
        sha256=obj.sha256,
        byte_size=obj.byte_size,
        mime=content_type,
        original_filename=filename,
    )
    session.add(record)
    await session.flush()
    await append_audit(
        session,
        company_id=company_id,
        actor_id=actor_id,
        action=AuditAction.FILE_UPLOADED,
        target_type="file",
        target_id=str(record.id),
        meta={"filename": filename, "sha256": obj.sha256, "size": obj.byte_size},
    )
    return record


async def get_download_url(
    storage: StorageProvider, file: PdfFile, expires_in: int = 3600
) -> str:
    return await storage.presign_get(file.storage_key, expires_in)


async def attach_to_revision(
    session: AsyncSession,
    *,
    revision_id: uuid.UUID,
    file_id: uuid.UUID,
    sheet_number: str,
    sheet_title: str,
    page_index: int = 0,
) -> RevisionFile:
    rf = RevisionFile(
        revision_id=revision_id,
        file_id=file_id,
        sheet_number=sheet_number,
        sheet_title=sheet_title,
        page_index=page_index,
    )
    session.add(rf)
    await session.flush()
    return rf


async def verify_uploaded(
    storage: StorageProvider, *, key: str, expected_sha256: str | None = None
) -> None:
    """Confirm an out-of-band upload landed (and matches hash if provided)."""

    obj = await storage.get(key)
    if obj is None:
        raise NotFound("upload not found")
    if expected_sha256 and obj.sha256 and obj.sha256 != expected_sha256:
        raise Conflict("sha256 mismatch")


__all__ = [
    "_sha256",
    "attach_to_revision",
    "get_download_url",
    "upload_blob",
    "verify_uploaded",
]
