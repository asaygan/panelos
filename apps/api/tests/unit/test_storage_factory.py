"""Storage factory builds the configured provider."""

from __future__ import annotations

from panelos_api.config import Settings
from panelos_api.storage.factory import get_storage
from panelos_api.storage.local import LocalStorage
from panelos_api.storage.s3 import S3Storage


def test_factory_builds_local() -> None:
    s = Settings(STORAGE_PROVIDER="local")
    assert isinstance(get_storage(s), LocalStorage)


def test_factory_builds_and_caches_s3() -> None:
    s = Settings(
        STORAGE_PROVIDER="s3",
        S3_BUCKET="b",
        S3_REGION="eu-central-1",
        S3_ACCESS_KEY_ID="k",
        S3_SECRET_ACCESS_KEY="s",
    )
    first = get_storage(s)
    assert isinstance(first, S3Storage)
    # One client per process, not one per request.
    assert get_storage(s) is first
