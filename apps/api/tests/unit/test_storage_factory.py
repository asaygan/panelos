"""Storage factory builds each provider; Supabase constructs even without creds."""

from __future__ import annotations

from panelos_api.config import Settings
from panelos_api.storage.factory import get_storage
from panelos_api.storage.local import LocalStorage
from panelos_api.storage.supabase import SupabaseStorage


def test_factory_builds_local() -> None:
    s = Settings(STORAGE_PROVIDER="local")
    assert isinstance(get_storage(s), LocalStorage)


def test_factory_builds_supabase_without_creds() -> None:
    # No SUPABASE_URL/SERVICE_KEY present: must still construct (no crash).
    s = Settings(STORAGE_PROVIDER="supabase", SUPABASE_URL=None, SUPABASE_SERVICE_KEY=None)
    store = get_storage(s)
    assert isinstance(store, SupabaseStorage)
    assert store.bucket == "panelos"


def test_supabase_presign_put_uses_app_route() -> None:
    store = SupabaseStorage(
        url="https://proj.supabase.co",
        service_key="svc",
        bucket="panelos",
        public_base_url="http://localhost:8000/api/v1/files",
    )
    import asyncio

    up = asyncio.run(store.presign_put("uploads/x/file.pdf", "application/pdf"))
    assert up.method == "PUT"
    assert up.url.endswith("/upload/uploads/x/file.pdf")
