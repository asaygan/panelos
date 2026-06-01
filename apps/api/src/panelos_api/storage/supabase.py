"""Supabase Storage provider — private bucket via the Storage REST API.

Uploads/downloads go through the service-role key (server-side only). Files stay
private: ``presign_get`` mints short-lived signed URLs via
``/object/sign/{bucket}/{path}``. ``presign_put`` returns the app's own
``/files/upload/{key}`` route (same contract as ``LocalStorage``), so the files
router's existing presign→PUT→finalize flow works unchanged; the raw PUT lands
in ``upload_raw`` which calls ``put`` (server-side REST upload to Supabase).
"""

from __future__ import annotations

import hashlib
import mimetypes
from typing import BinaryIO
from urllib.parse import quote

import httpx

from panelos_api.core.exceptions import NotFound
from panelos_api.storage.base import PresignedUpload, StorageObject


class SupabaseStorage:
    """Supabase Storage backend (private bucket, signed download URLs)."""

    def __init__(
        self,
        *,
        url: str,
        service_key: str,
        bucket: str,
        public_base_url: str | None = None,
    ) -> None:
        self.url = url.rstrip("/")
        self.service_key = service_key
        self.bucket = bucket
        # App route used for presigned PUT (mirrors LocalStorage contract).
        self.public_base_url = (public_base_url or "").rstrip("/")

    def _headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        h = {
            "Authorization": f"Bearer {self.service_key}",
            "apikey": self.service_key,
        }
        if extra:
            h.update(extra)
        return h

    def _object_url(self, key: str) -> str:
        return f"{self.url}/storage/v1/object/{self.bucket}/{quote(key)}"

    async def put(self, key: str, data: BinaryIO, content_type: str) -> StorageObject:
        body = data.read()
        digest = hashlib.sha256(body).hexdigest()
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                self._object_url(key),
                content=body,
                headers=self._headers(
                    {"Content-Type": content_type, "x-upsert": "true"}
                ),
            )
            if resp.status_code not in (200, 201):
                resp.raise_for_status()
        return StorageObject(
            key=key,
            content_type=content_type,
            byte_size=len(body),
            sha256=digest,
        )

    async def get(self, key: str) -> StorageObject:
        guessed, _ = mimetypes.guess_type(key)
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.head(self._object_url(key), headers=self._headers())
            if resp.status_code == 404:
                raise NotFound(f"object {key} not found")
            if resp.status_code >= 400:
                resp.raise_for_status()
            size = int(resp.headers.get("content-length", 0))
            ctype = resp.headers.get("content-type") or guessed or "application/octet-stream"
        return StorageObject(key=key, content_type=ctype, byte_size=size)

    async def get_bytes(self, key: str) -> bytes:
        """Fetch the raw object bytes (used by label logo + serve fallback)."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(self._object_url(key), headers=self._headers())
            if resp.status_code == 404:
                raise NotFound(f"object {key} not found")
            if resp.status_code >= 400:
                resp.raise_for_status()
            return resp.content

    async def delete(self, key: str) -> None:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(self._object_url(key), headers=self._headers())
            if resp.status_code not in (200, 204, 404):
                resp.raise_for_status()

    async def presign_get(self, key: str, expires_in: int = 3600) -> str:
        """Mint a short-lived signed download URL for the private object."""
        sign_url = f"{self.url}/storage/v1/object/sign/{self.bucket}/{quote(key)}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                sign_url,
                json={"expiresIn": expires_in},
                headers=self._headers({"Content-Type": "application/json"}),
            )
            if resp.status_code == 404:
                raise NotFound(f"object {key} not found")
            resp.raise_for_status()
            signed_path = resp.json().get("signedURL") or resp.json().get("signedUrl") or ""
        if signed_path.startswith("http"):
            return signed_path
        return f"{self.url}/storage/v1{signed_path}"

    async def presign_put(
        self, key: str, content_type: str, expires_in: int = 3600
    ) -> PresignedUpload:
        # Route uploads through the app (PUT /files/upload/{key}); the handler
        # calls SupabaseStorage.put which uploads to the private bucket. Mirrors
        # the LocalStorage contract so the files router flow is unchanged.
        base = self.public_base_url or ""
        return PresignedUpload(
            url=f"{base}/upload/{key}",
            key=key,
            method="PUT",
            headers={"Content-Type": content_type},
            expires_in=expires_in,
        )
