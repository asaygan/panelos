"""Pick a storage provider from settings."""

from __future__ import annotations

from typing import TYPE_CHECKING

from panelos_api.config import Settings, get_settings

if TYPE_CHECKING:
    from panelos_api.storage.base import StorageProvider


def get_storage(settings: Settings | None = None) -> StorageProvider:
    """Instantiate the configured storage provider."""

    s = settings or get_settings()
    if s.STORAGE_PROVIDER == "local":
        from panelos_api.storage.local import LocalStorage

        return LocalStorage(s.STORAGE_LOCAL_PATH, s.STORAGE_PUBLIC_BASE_URL)
    if s.STORAGE_PROVIDER == "s3":
        from panelos_api.storage.s3 import S3Storage

        return S3Storage(
            bucket=s.S3_BUCKET,
            region=s.S3_REGION,
            endpoint_url=s.S3_ENDPOINT_URL,
            access_key_id=s.S3_ACCESS_KEY_ID,
            secret_access_key=s.S3_SECRET_ACCESS_KEY,
        )
    if s.STORAGE_PROVIDER == "supabase":
        from panelos_api.storage.supabase import SupabaseStorage

        return SupabaseStorage(
            url=s.SUPABASE_URL or "",
            service_key=s.SUPABASE_SERVICE_KEY or "",
            bucket=s.SUPABASE_BUCKET,
            public_base_url=s.STORAGE_PUBLIC_BASE_URL,
        )
    if s.STORAGE_PROVIDER == "azure":
        from panelos_api.storage.azure import AzureStorage

        return AzureStorage(
            account=s.AZURE_STORAGE_ACCOUNT or "",
            key=s.AZURE_STORAGE_KEY or "",
            container=s.AZURE_CONTAINER,
        )
    raise ValueError(f"unknown STORAGE_PROVIDER: {s.STORAGE_PROVIDER}")
