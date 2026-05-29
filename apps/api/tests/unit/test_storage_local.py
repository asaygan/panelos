"""LocalStorage round-trip."""

from __future__ import annotations

import asyncio
import io
from pathlib import Path

from panelos_api.storage.local import LocalStorage


def test_put_get_delete(tmp_path: Path) -> None:
    async def run() -> None:
        store = LocalStorage(str(tmp_path), "http://localhost/files")
        obj = await store.put("a/b.bin", io.BytesIO(b"hello"), "application/octet-stream")
        assert obj.byte_size == 5
        assert obj.sha256
        got = await store.get("a/b.bin")
        assert got.byte_size == 5
        url = await store.presign_get("a/b.bin")
        assert url.endswith("a/b.bin")
        await store.delete("a/b.bin")

    asyncio.run(run())
