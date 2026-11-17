"""File presign + finalize + attach to revision."""

from __future__ import annotations

import io
import re
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
from panelos_api.core.exceptions import Forbidden, NotFound, ValidationFailed
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
from panelos_api.services import file_service, revision_service

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from panelos_api.storage.base import StorageProvider

router = APIRouter(prefix="/files", tags=["files"])

# Content types a tenant may upload: schematic PDFs and logo images.
ALLOWED_UPLOAD_TYPES: dict[str, tuple[bytes, ...]] = {
    "application/pdf": (b"%PDF-",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/svg+xml": (b"<svg", b"<?xml"),
    "image/webp": (b"RIFF",),
}
_SHA256_RE = re.compile(r"^[0-9a-f]{64}$")


def _safe_filename(name: str) -> str:
    """Reduce a client-supplied filename to a safe storage key segment."""
    base = name.replace("\\", "/").rsplit("/", 1)[-1]
    base = re.sub(r"[^A-Za-z0-9._-]+", "_", base).strip("._")
    return (base or "upload")[:120]


def _assert_may_upload(m: CurrentMembership, content_type: str) -> None:
    """Schematic PDFs need UPLOAD_PDF; photos can come from anyone doing field work."""

    if m.can(Permission.UPLOAD_PDF):
        return
    is_image = content_type.startswith("image/")
    if is_image and (m.can(Permission.REPORT_ISSUE) or m.can(Permission.MANAGE_MAINTENANCE)):
        return
    raise Forbidden(f"permission denied: {Permission.UPLOAD_PDF.value}")


def _company_prefix(company_id: uuid.UUID) -> str:
    return f"uploads/{company_id}/"


@router.post("/presign", response_model=PresignResponse)
async def presign(
    payload: PresignRequest,
    m: CurrentMembership = Depends(get_current_membership),
    storage: StorageProvider = Depends(get_storage),
) -> PresignResponse:
    _assert_may_upload(m, payload.content_type)
    if payload.content_type not in ALLOWED_UPLOAD_TYPES:
        raise ValidationFailed(f"unsupported content type: {payload.content_type}")
    key = f"{_company_prefix(m.company_id)}{uuid.uuid4()}/{_safe_filename(payload.filename)}"
    up = await storage.presign_put(key, payload.content_type)
    return PresignResponse(
        url=up.url, key=up.key, method=up.method, headers=up.headers, expires_in=up.expires_in
    )


@router.post("/finalize", response_model=FileOut)
async def finalize(
    payload: FinalizeRequest,
    m: CurrentMembership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
    storage: StorageProvider = Depends(get_storage),
    settings: Settings = Depends(get_settings),
) -> FileOut:
    # The key must be one this company was handed by /presign: otherwise a
    # caller could register (and then download) another tenant's object.
    if not payload.key.startswith(_company_prefix(m.company_id)) or ".." in payload.key:
        raise NotFound("upload not found")
    obj = await storage.get(payload.key)
    if obj.byte_size <= 0:
        raise ValidationFailed("uploaded file is empty")
    if obj.byte_size > settings.MAX_UPLOAD_BYTES:
        await storage.delete(payload.key)
        raise ValidationFailed(
            f"file too large (max {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB)"
        )
    # Never trust the declared type: sniff the first bytes of what actually
    # landed in storage and record the detected type.
    mime = payload.content_type
    get_bytes = getattr(storage, "get_bytes", None)
    if get_bytes is not None:
        head = (await get_bytes(payload.key, 16)).lstrip()
        detected = next(
            (ct for ct, sigs in ALLOWED_UPLOAD_TYPES.items() if head.startswith(sigs)), None
        )
        if detected is None:
            await storage.delete(payload.key)
            raise ValidationFailed("unsupported file: only PDF and PNG/JPEG/SVG/WebP are allowed")
        mime = detected
    elif mime not in ALLOWED_UPLOAD_TYPES:
        raise ValidationFailed(f"unsupported content type: {mime}")
    # Permission is decided on what the file really is, not what was declared.
    _assert_may_upload(m, mime)
    client_sha = (payload.sha256 or "").lower()
    if client_sha and not _SHA256_RE.match(client_sha):
        raise ValidationFailed("sha256 must be 64 hex characters")
    record = PdfFile(
        company_id=m.company_id,
        storage_provider=settings.STORAGE_PROVIDER,
        storage_key=payload.key,
        sha256=obj.sha256 or client_sha,
        byte_size=obj.byte_size,
        mime=mime,
        original_filename=_safe_filename(payload.original_filename),
    )
    db.add(record)
    await db.flush()
    from panelos_api.core.audit import append_audit
    from panelos_api.db.models.audit_log import AuditAction

    await append_audit(
        db,
        company_id=m.company_id,
        actor_id=m.user.id,
        action=AuditAction.FILE_UPLOADED,
        target_type="file",
        target_id=str(record.id),
        meta={
            "filename": payload.original_filename,
            "sha256": record.sha256,
            "size": record.byte_size,
        },
    )
    return FileOut.model_validate(record)


@router.put("/upload/{key:path}", status_code=status.HTTP_200_OK)
async def upload_raw(
    key: str,
    request: Request,
    storage: StorageProvider = Depends(get_storage),
    settings: Settings = Depends(get_settings),
) -> dict[str, str]:
    """Target of ``LocalStorage.presign_put``: store the raw request body at ``key``.

    LOCAL-ONLY. This is the destination of a *local* presigned PUT URL. For
    non-local providers (s3/supabase/azure), ``presign_put`` returns a provider
    signed URL and the browser uploads there directly — so this unauthenticated
    write endpoint must be inert in prod, otherwise it would let anyone overwrite
    arbitrary storage keys. The local key embeds company id + a random uuid.
    """
    if settings.STORAGE_PROVIDER != "local":
        raise NotFound("not found")
    body = await request.body()
    content_type = request.headers.get("content-type", "application/octet-stream")
    obj = await storage.put(key, io.BytesIO(body), content_type)
    return {"key": obj.key, "sha256": obj.sha256}


@router.get("/serve/{key:path}")
async def serve_raw(
    key: str,
    storage: StorageProvider = Depends(get_storage),
    settings: Settings = Depends(get_settings),
) -> Response:
    """Target of ``LocalStorage.presign_get``: stream stored bytes back.

    LOCAL-ONLY (presigned-URL semantics for local dev). Non-local providers serve
    files via short-lived provider signed URLs (see ``file_service.get_download_url``),
    so this route is disabled when not on the local provider and never becomes a
    world-readable hole in prod.
    """
    if settings.STORAGE_PROVIDER != "local":
        raise NotFound("not found")
    obj = await storage.get(key)
    get_bytes = getattr(storage, "get_bytes", None)
    if get_bytes is None:
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
    # Every id in this call must belong to the caller's company AND to each
    # other: revision -> panel in the path -> company; file -> company.
    panel = await db.get(Panel, panel_id)
    if panel is None or panel.company_id != m.company_id:
        raise NotFound("panel not found")
    rev = await db.get(PanelRevision, revision_id)
    if rev is None or rev.panel_id != panel.id:
        raise NotFound("revision not found")
    pdf = await db.get(PdfFile, payload.file_id)
    if pdf is None or pdf.company_id != m.company_id:
        raise NotFound("file not found")
    revision_service.ensure_editable(rev)
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
    """Load an editable sheet (revision_file) owned by the caller's company.

    Raises 404 for another tenant's sheet and 409 when the parent revision is
    no longer a draft.
    """
    rf = await db.get(RevisionFile, sheet_id)
    if rf is None:
        raise NotFound("sheet not found")
    rev = await db.get(PanelRevision, rf.revision_id)
    panel = await db.get(Panel, rev.panel_id) if rev else None
    if rev is None or panel is None or panel.company_id != company_id:
        raise NotFound("sheet not found")
    revision_service.ensure_editable(rev)
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
