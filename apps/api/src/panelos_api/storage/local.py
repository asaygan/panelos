"""Filesystem-backed storage for local dev."""

from __future__ import annotations

import hashlib
import mimetypes
import os
from pathlib import Path
from typing import BinaryIO

from panelos_api.storage.base import PresignedUpload, StorageObject


class LocalStorage:
    """Stores blobs under ``base_path``."""

    def __init__(self, base_path: str, public_base_url: str) -> None:
        self.base_path = Path(base_path).resolve()
        self.public_base_url = public_base_url.rstrip("/")
        self.base_path.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        # Normalize: drop leading slashes, prevent path escape.
        clean = key.lstrip("/").replace("..", "")
        return self.base_path / clean

    async def put(self, key: str, data: BinaryIO, content_type: str) -> StorageObject:
        target = self._path(key)
        target.parent.mkdir(parents=True, exist_ok=True)
        h = hashlib.sha256()
        size = 0
        with target.open("wb") as f:
            while chunk := data.read(64 * 1024):
                h.update(chunk)
                size += len(chunk)
                f.write(chunk)
        return StorageObject(
            key=key,
            content_type=content_type,
            byte_size=size,
            sha256=h.hexdigest(),
            url=f"{self.public_base_url}/{key}",
        )

    async def get(self, key: str) -> StorageObject:
        p = self._path(key)
        if not p.exists():
            from panelos_api.core.exceptions import NotFound

            raise NotFound(f"object {key} not found")
        guessed, _ = mimetypes.guess_type(key)
        return StorageObject(
            key=key,
            content_type=guessed or "application/octet-stream",
            byte_size=p.stat().st_size,
            url=f"{self.public_base_url}/serve/{key}",
        )

    async def get_bytes(self, key: str) -> bytes:
        """Return the raw stored bytes (local-only helper for the serve route)."""
        p = self._path(key)
        if not p.exists():
            from panelos_api.core.exceptions import NotFound

            raise NotFound(f"object {key} not found")
        return p.read_bytes()

    async def delete(self, key: str) -> None:
        p = self._path(key)
        if p.exists():
            os.remove(p)

    async def presign_get(self, key: str, expires_in: int = 3600) -> str:
        # Maps to GET /api/v1/files/serve/{key:path} (see routers/files.py).
        return f"{self.public_base_url}/serve/{key}"

    async def presign_put(
        self, key: str, content_type: str, expires_in: int = 3600
    ) -> PresignedUpload:
        # Maps to PUT /api/v1/files/upload/{key:path} (see routers/files.py).
        return PresignedUpload(
            url=f"{self.public_base_url}/upload/{key}",
            key=key,
            method="PUT",
            headers={"Content-Type": content_type},
            expires_in=expires_in,
        )
