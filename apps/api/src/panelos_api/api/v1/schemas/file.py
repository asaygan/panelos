"""File schemas."""

import uuid

from panelos_api.api.v1.schemas.common import ORMModel


class PresignRequest(ORMModel):
    filename: str
    content_type: str = "application/pdf"


class PresignResponse(ORMModel):
    url: str
    key: str
    method: str
    headers: dict[str, str]
    expires_in: int


class FinalizeRequest(ORMModel):
    key: str
    sha256: str | None = None
    byte_size: int | None = None
    original_filename: str = "upload.pdf"
    content_type: str = "application/pdf"


class FileOut(ORMModel):
    id: uuid.UUID
    storage_key: str
    sha256: str
    byte_size: int
    mime: str
    original_filename: str


class AttachSheetIn(ORMModel):
    file_id: uuid.UUID
    sheet_number: str
    sheet_title: str
    page_index: int = 0


class UpdateSheetIn(ORMModel):
    sheet_number: str | None = None
    sheet_title: str | None = None
    page_index: int | None = None


class SheetOut(ORMModel):
    id: uuid.UUID
    file_id: uuid.UUID
    sheet_number: str
    sheet_title: str
    page_index: int
