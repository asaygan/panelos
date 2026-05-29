"""Azure Blob Storage provider — interface stub."""

from __future__ import annotations

from typing import TYPE_CHECKING, BinaryIO

if TYPE_CHECKING:
    from panelos_api.storage.base import PresignedUpload, StorageObject


class AzureStorage:
    """TODO: wire azure-storage-blob SDK."""

    def __init__(self, *, account: str, key: str, container: str) -> None:
        self.account = account
        self.key = key
        self.container = container

    async def put(self, key: str, data: BinaryIO, content_type: str) -> StorageObject:
        raise NotImplementedError("AzureStorage.put — TODO")

    async def get(self, key: str) -> StorageObject:
        raise NotImplementedError("AzureStorage.get — TODO")

    async def delete(self, key: str) -> None:
        raise NotImplementedError("AzureStorage.delete — TODO")

    async def presign_get(self, key: str, expires_in: int = 3600) -> str:
        raise NotImplementedError("AzureStorage.presign_get — TODO")

    async def presign_put(
        self, key: str, content_type: str, expires_in: int = 3600
    ) -> PresignedUpload:
        raise NotImplementedError("AzureStorage.presign_put — TODO")
