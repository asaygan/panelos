"""File presign + finalize + attach to revision."""

from __future__ import annotations

import io
import uuid
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, Request, Response, status

from panelos_api.api.v1.schemas.file import (
    AttachSheetIn,
    FileOut,
    FinalizeRequest,
    PresignRequest,
    PresignResponse,
    SheetOut,
    UpdateSheetIn,
)
from panelos_api.config import Settings, get_settings
from panelos_api.core.exceptions import NotFound
from panelos_api.core.rbac import Permission
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision
from panelos_api.db.models.pdf_file import PdfFile
from panelos_api.db.models.revision_file import RevisionFile
from panelos_api.deps import (
    CurrentMembership,
    get_current_membership,
    get_db,
    get_storage,
    require_permission,
)
from panelos_api.services import file_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.storage.base import StorageProvider

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/presign", response_model=PresignResponse)
async def presign(
    payload: PresignRequest,
    m: CurrentMembership = Depends(require_permission(Permission.UPLOAD_PDF)),
    storage: StorageProvider = Depends(get_storage),
) -> PresignResponse:
    key = f"uploads/{m.company_id}/{uuid.uuid4()}/{payload.filename}"
    up = await storage.presign_put(key, payload.content_type)
    return PresignResponse(
        url=up.url, key=up.key, method=up.method, headers=up.headers, expires_in=up.expires_in
    )


@router.post("/finalize", response_model=FileOut)
async def finalize(
    payload: FinalizeRequest,
    m: CurrentMembership = Depends(require_permission(Permission.UPLOAD_PDF)),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
    settings: Settings = Depends(get_settings),
) -> FileOut:
    obj = await storage.get(payload.key)
    record = PdfFile(
        company_id=m.company_id,
        storage_provider=settings.STORAGE_PROVIDER,
        storage_key=payload.key,
        sha256=payload.sha256 or obj.sha256 or "",
        byte_size=obj.byte_size,
        mime=payload.content_type,
        original_filename=payload.original_filename,
    )
    db.add(record)
    await db.flush()
    return FileOut.model_validate(record)


@router.put("/upload/{key:path}", status_code=status.HTTP_200_OK)
async def upload_raw(
    key: str,
    request: Request,
    storage: StorageProvider = Depends(get_storage),
) -> dict[str, str]:
    """Target of ``LocalStorage.presign_put``: store the raw request body at ``key``.

    No auth: this is the destination of a presigned PUT URL. The key embeds the
    company id + a random uuid, so it is unguessable. TODO: sign URLs in prod.
    """
    body = await request.body()
    content_type = request.headers.get("content-type", "application/octet-stream")
    obj = await storage.put(key, io.BytesIO(body), content_type)
    return {"key": obj.key, "sha256": obj.sha256}


@router.get("/serve/{key:path}")
async def serve_raw(
    key: str,
    storage: StorageProvider = Depends(get_storage),
) -> Response:
    """Target of ``LocalStorage.presign_get``: stream stored bytes back.

    No auth required (presigned URL semantics) for local dev.
    TODO: sign URLs in prod so this isn't world-readable.
    """
    obj = await storage.get(key)
    get_bytes = getattr(storage, "get_bytes", None)
    if get_bytes is None:
        # Non-local providers expose direct download URLs; redirect there.
        return Response(status_code=status.HTTP_404_NOT_FOUND)
    data = await get_bytes(key)
    return Response(content=data, media_type=obj.content_type or "application/octet-stream")


@router.get("/{file_id}")
async def get_file_url(
    file_id: uuid.UUID,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
) -> dict[str, str]:
    f = await db.get(PdfFile, file_id)
    if f is None or f.company_id != m.company_id:
        raise NotFound("file not found")
    url = await file_service.get_download_url(storage, f)
    return {"url": url}


@router.post(
    "/panels/{panel_id}/revisions/{revision_id}/sheets",
    status_code=status.HTTP_201_CREATED,
)
async def attach_sheet(
    panel_id: uuid.UUID,
    revision_id: uuid.UUID,
    payload: AttachSheetIn,
    m: CurrentMembership = Depends(require_permission(Permission.UPLOAD_PDF)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    rf = await file_service.attach_to_revision(
        db,
        revision_id=revision_id,
        file_id=payload.file_id,
        sheet_number=payload.sheet_number,
        sheet_title=payload.sheet_title,
        page_index=payload.page_index,
    )
    return {"id": str(rf.id)}


async def _load_owned_sheet(
    db: AsyncSession, company_id: uuid.UUID, sheet_id: uuid.UUID
) -> RevisionFile:
    """Load a sheet (revision_file) and verify it belongs to the caller's company."""
    rf = await db.get(RevisionFile, sheet_id)
    if rf is None:
        raise NotFound("sheet not found")
    rev = await db.get(PanelRevision, rf.revision_id)
    panel = await db.get(Panel, rev.panel_id) if rev else None
    if panel is None or panel.company_id != company_id:
        raise NotFound("sheet not found")
    return rf


@router.patch("/sheets/{sheet_id}", response_model=SheetOut)
async def update_sheet(
    sheet_id: uuid.UUID,
    payload: UpdateSheetIn,
    m: CurrentMembership = Depends(require_permission(Permission.UPLOAD_PDF)),
    db: AsyncSession = Depends(get_db),
) -> SheetOut:
    rf = await _load_owned_sheet(db, m.company_id, sheet_id)
    if payload.sheet_number is not None:
        rf.sheet_number = payload.sheet_number
    if payload.sheet_title is not None:
        rf.sheet_title = payload.sheet_title
    if payload.page_index is not None:
        rf.page_index = payload.page_index
    await db.flush()
    return SheetOut.model_validate(rf)


@router.delete("/sheets/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sheet(
    sheet_id: uuid.UUID,
    m: CurrentMembership = Depends(require_permission(Permission.UPLOAD_PDF)),
    db: AsyncSession = Depends(get_db),
) -> Response:
    rf = await _load_owned_sheet(db, m.company_id, sheet_id)
    await db.delete(rf)
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
