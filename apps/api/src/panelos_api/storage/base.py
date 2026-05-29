"""Storage provider protocol + value objects."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import BinaryIO, Protocol, runtime_checkable


@dataclass(slots=True)
class StorageObject:
    """Reference to a stored blob."""

    key: str
    content_type: str
    byte_size: int = 0
    sha256: str = ""
    url: str | None = None


@dataclass(slots=True)
class PresignedUpload:
    """Presigned PUT URL bundle."""

    url: str
    key: str
    method: str = "PUT"
    headers: dict[str, str] = field(default_factory=dict)
    expires_in: int = 3600


@runtime_checkable
class StorageProvider(Protocol):
    """Async interface for blob storage backends."""

    async def put(self, key: str, data: BinaryIO, content_type: str) -> StorageObject: ...
    async def get(self, key: str) -> StorageObject: ...
    async def delete(self, key: str) -> None: ...
    async def presign_get(self, key: str, expires_in: int = 3600) -> str: ...
    async def presign_put(
        self, key: str, content_type: str, expires_in: int = 3600
    ) -> PresignedUpload: ...
