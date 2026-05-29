"""Supabase storage provider — interface stub for future wiring."""

from __future__ import annotations

from typing import TYPE_CHECKING, BinaryIO

if TYPE_CHECKING:
    from panelos_api.storage.base import PresignedUpload, StorageObject


class SupabaseStorage:
    """TODO: wire Supabase Storage REST API + signed URLs."""

    def __init__(self, *, url: str, service_key: str, bucket: str) -> None:
        self.url = url
        self.service_key = service_key
        self.bucket = bucket

    async def put(self, key: str, data: BinaryIO, content_type: str) -> StorageObject:
        raise NotImplementedError("SupabaseStorage.put — TODO")

    async def get(self, key: str) -> StorageObject:
        raise NotImplementedError("SupabaseStorage.get — TODO")

    async def delete(self, key: str) -> None:
        raise NotImplementedError("SupabaseStorage.delete — TODO")

    async def presign_get(self, key: str, expires_in: int = 3600) -> str:
        raise NotImplementedError("SupabaseStorage.presign_get — TODO")

    async def presign_put(
        self, key: str, content_type: str, expires_in: int = 3600
    ) -> PresignedUpload:
        raise NotImplementedError("SupabaseStorage.presign_put — TODO")
