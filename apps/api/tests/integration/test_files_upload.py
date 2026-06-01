"""File upload flow against a real Postgres container + local storage.

Covers: presign → PUT the bytes (local storage) → finalize (PdfFile row) →
attach as a sheet to a revision → GET the panel's sheets returns it.
"""

from __future__ import annotations

import pytest

API = "/api/v1"

PDF_BYTES = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


@pytest.mark.asyncio
async def test_presign_put_finalize_attach_list(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]

    # Panel + draft revision to attach the sheet to.
    r = await app_client.post(
        f"{API}/panels",
        json={"tag": "FILE-01", "serial": "FILE-SN", "name": "File Panel"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    r = await app_client.post(
        f"{API}/panels/{pid}/revisions", json={"change_summary": "sheets"}, headers=headers
    )
    rev_id = r.json()["id"]

    # 1. Presign.
    r = await app_client.post(
        f"{API}/files/presign",
        json={"filename": "schematic.pdf", "content_type": "application/pdf"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    presign = r.json()
    key = presign["key"]
    assert presign["method"] == "PUT"

    # 2. PUT the bytes to the local-storage upload route (presigned, no auth).
    #    The upload route returns the server-computed sha256 the client forwards.
    r = await app_client.put(
        f"{API}/files/upload/{key}",
        content=PDF_BYTES,
        headers={"Content-Type": "application/pdf"},
    )
    assert r.status_code == 200, r.text
    sha256 = r.json()["sha256"]
    assert sha256

    # 3. Finalize → creates a PdfFile record.
    r = await app_client.post(
        f"{API}/files/finalize",
        json={
            "key": key,
            "sha256": sha256,
            "original_filename": "schematic.pdf",
            "content_type": "application/pdf",
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text
    file_out = r.json()
    file_id = file_out["id"]
    assert file_out["byte_size"] == len(PDF_BYTES)
    assert file_out["sha256"]

    # 4. Attach as a sheet on the revision.
    r = await app_client.post(
        f"{API}/files/panels/{pid}/revisions/{rev_id}/sheets",
        json={
            "file_id": file_id,
            "sheet_number": "1",
            "sheet_title": "Power Schematic",
            "page_index": 0,
        },
        headers=headers,
    )
    assert r.status_code == 201, r.text

    # 5. GET the panel's sheets returns it.
    r = await app_client.get(
        f"{API}/panels/{pid}/sheets", params={"revision_id": rev_id}, headers=headers
    )
    assert r.status_code == 200, r.text
    sheets = r.json()
    assert len(sheets) == 1
    assert sheets[0]["file_id"] == file_id
    assert sheets[0]["sheet_title"] == "Power Schematic"

    # Bonus: the file download-url endpoint resolves for the owning tenant.
    r = await app_client.get(f"{API}/files/{file_id}", headers=headers)
    assert r.status_code == 200, r.text
    assert "url" in r.json()
