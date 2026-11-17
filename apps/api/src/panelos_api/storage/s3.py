"""S3 / MinIO storage via boto3.

boto3 is synchronous; every call is pushed to a worker thread so a slow S3
round-trip never blocks the event loop (and with it every other request).
"""

from __future__ import annotations

import hashlib
from typing import Any, BinaryIO

import boto3
from anyio import to_thread
from botocore.config import Config
from botocore.exceptions import ClientError

from panelos_api.core.exceptions import NotFound
from panelos_api.storage.base import PresignedUpload, StorageObject


class S3Storage:
    """boto3-backed provider; works for AWS S3 and MinIO (set ``endpoint_url``)."""

    def __init__(
        self,
        *,
        bucket: str,
        region: str,
        endpoint_url: str | None,
        access_key_id: str | None,
        secret_access_key: str | None,
    ) -> None:
        self.bucket = bucket
        self._client: Any = boto3.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual"} if endpoint_url is None else {},
                retries={"max_attempts": 3, "mode": "standard"},
                connect_timeout=5,
                read_timeout=30,
            ),
        )

    async def put(self, key: str, data: BinaryIO, content_type: str) -> StorageObject:
        body = data.read()
        digest = hashlib.sha256(body).hexdigest()
        await to_thread.run_sync(
            lambda: self._client.put_object(
                Bucket=self.bucket, Key=key, Body=body, ContentType=content_type
            )
        )
        return StorageObject(key=key, content_type=content_type, byte_size=len(body), sha256=digest)

    async def get(self, key: str) -> StorageObject:
        try:
            head = await to_thread.run_sync(
                lambda: self._client.head_object(Bucket=self.bucket, Key=key)
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                raise NotFound(f"object {key} not found") from exc
            raise
        return StorageObject(
            key=key,
            content_type=head.get("ContentType", "application/octet-stream"),
            byte_size=int(head.get("ContentLength", 0)),
        )

    async def get_bytes(self, key: str, limit: int | None = None) -> bytes:
        """Return the object's bytes (or just the first ``limit`` bytes)."""
        params: dict[str, Any] = {"Bucket": self.bucket, "Key": key}
        if limit is not None:
            params["Range"] = f"bytes=0-{max(limit, 1) - 1}"

        def _read() -> bytes:
            body: bytes = self._client.get_object(**params)["Body"].read()
            return body

        return await to_thread.run_sync(_read)

    async def delete(self, key: str) -> None:
        await to_thread.run_sync(lambda: self._client.delete_object(Bucket=self.bucket, Key=key))

    async def presign_get(
        self, key: str, expires_in: int = 3600, *, download_name: str | None = None
    ) -> str:
        params: dict[str, Any] = {"Bucket": self.bucket, "Key": key}
        if download_name:
            safe = download_name.replace('"', "")
            params["ResponseContentDisposition"] = f'attachment; filename="{safe}"'
        url: str = self._client.generate_presigned_url(
            "get_object", Params=params, ExpiresIn=expires_in
        )
        return url

    async def presign_put(
        self, key: str, content_type: str, expires_in: int = 900
    ) -> PresignedUpload:
        url: str = self._client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self.bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expires_in,
        )
        return PresignedUpload(
            url=url,
            key=key,
            method="PUT",
            headers={"Content-Type": content_type},
            expires_in=expires_in,
        )
