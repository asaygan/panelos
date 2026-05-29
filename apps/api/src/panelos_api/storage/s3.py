"""S3 / MinIO storage via boto3."""

from __future__ import annotations

import hashlib
from typing import Any, BinaryIO

import boto3
from botocore.config import Config

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
            config=Config(signature_version="s3v4"),
        )

    async def put(self, key: str, data: BinaryIO, content_type: str) -> StorageObject:
        body = data.read()
        digest = hashlib.sha256(body).hexdigest()
        self._client.put_object(Bucket=self.bucket, Key=key, Body=body, ContentType=content_type)
        return StorageObject(
            key=key, content_type=content_type, byte_size=len(body), sha256=digest
        )

    async def get(self, key: str) -> StorageObject:
        head = self._client.head_object(Bucket=self.bucket, Key=key)
        return StorageObject(
            key=key,
            content_type=head.get("ContentType", "application/octet-stream"),
            byte_size=int(head.get("ContentLength", 0)),
        )

    async def delete(self, key: str) -> None:
        self._client.delete_object(Bucket=self.bucket, Key=key)

    async def presign_get(self, key: str, expires_in: int = 3600) -> str:
        url: str = self._client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )
        return url

    async def presign_put(
        self, key: str, content_type: str, expires_in: int = 3600
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
