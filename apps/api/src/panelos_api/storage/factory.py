"""Pick a storage provider from settings."""

from __future__ import annotations

from functools import lru_cache
from typing import TYPE_CHECKING

from panelos_api.config import Settings, get_settings

if TYPE_CHECKING:
    from panelos_api.storage.base import StorageProvider


@lru_cache(maxsize=4)
def _s3(
    bucket: str, region: str, endpoint_url: str | None, key_id: str | None, secret: str | None
) -> StorageProvider:
    """One boto3 client per process (building one per request costs ~50 ms)."""
    from panelos_api.storage.s3 import S3Storage

    return S3Storage(
        bucket=bucket,
        region=region,
        endpoint_url=endpoint_url,
        access_key_id=key_id,
        secret_access_key=secret,
    )


def get_storage(settings: Settings | None = None) -> StorageProvider:
    """Return the configured storage provider."""

    s = settings or get_settings()
    if s.STORAGE_PROVIDER == "local":
        from panelos_api.storage.local import LocalStorage

        return LocalStorage(s.STORAGE_LOCAL_PATH, s.STORAGE_PUBLIC_BASE_URL)
    if s.STORAGE_PROVIDER == "s3":
        return _s3(
            s.S3_BUCKET, s.S3_REGION, s.S3_ENDPOINT_URL, s.S3_ACCESS_KEY_ID, s.S3_SECRET_ACCESS_KEY
        )
    raise ValueError(f"unknown STORAGE_PROVIDER: {s.STORAGE_PROVIDER}")
