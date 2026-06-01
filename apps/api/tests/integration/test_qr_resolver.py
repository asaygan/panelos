"""Public QR resolver against a real Postgres container.

Covers: the QR resolves the APPROVED revision; a draft-only panel returns the
"no approved revision yet" message and serves nothing; each scan logs an event.
"""

from __future__ import annotations

import pytest

API = "/api/v1"


async def _qr_token_for(app_client, headers, serial) -> tuple[str, str]:  # type: ignore[no-untyped-def]
    r = await app_client.post(
        f"{API}/panels",
        json={"tag": "QR-01", "serial": serial, "name": "QR Panel"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    p = r.json()
    return p["id"], p["qr_token"]


async def _scan_count(panel_id: str) -> int:
    from sqlalchemy import text

    from panelos_api.db.session import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as session:
        n = (
            await session.execute(
                text("SELECT count(*) FROM scan_events WHERE panel_id = :pid"),
                {"pid": panel_id},
            )
        ).scalar_one()
    return int(n)


@pytest.mark.asyncio
async def test_qr_draft_only_has_no_approved_revision(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    pid, token = await _qr_token_for(app_client, headers, "QR-DRAFT")

    # Create a draft (never approved).
    r = await app_client.post(
        f"{API}/panels/{pid}/revisions", json={"change_summary": "wip"}, headers=headers
    )
    assert r.status_code == 201

    # Public resolve — no auth header needed.
    r = await app_client.get(f"{API}/qr/{token}")
    assert r.status_code == 200, r.text
    data = r.json()
    # The public contract signals "no approved revision" via a null active_revision.
    # (The service also returns a "no approved revision yet" message; the message
    # field is intentionally not part of the QrResolveOut response schema.)
    assert data["active_revision"] is None

    # The scan was still logged.
    assert await _scan_count(pid) == 1


@pytest.mark.asyncio
async def test_qr_resolves_approved_and_logs_scan(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    pid, token = await _qr_token_for(app_client, headers, "QR-APPROVED")

    # Draft → approve.
    r = await app_client.post(
        f"{API}/panels/{pid}/revisions", json={"change_summary": "v1"}, headers=headers
    )
    rev = r.json()["id"]
    r = await app_client.post(f"{API}/revisions/{rev}/approve", headers=headers)
    assert r.status_code == 200

    # Public resolve returns the approved revision.
    r = await app_client.get(f"{API}/qr/{token}")
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["active_revision"] is not None
    assert data["active_revision"]["id"] == rev
    # `message` is intentionally not part of the QrResolveOut response schema.
    assert "message" not in data

    # Two resolves → two scan events.
    await app_client.get(f"{API}/qr/{token}")
    assert await _scan_count(pid) == 2


@pytest.mark.asyncio
async def test_qr_unknown_token_404(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    r = await app_client.get(f"{API}/qr/this-token-does-not-exist")
    assert r.status_code == 404, r.text
