"""Revision approval pipeline against a real Postgres container.

Covers: draft → submit → approve flips the panel's ``active_revision_id``,
approving a second revision supersedes the prior approved one, and every
transition writes an audit row.
"""

from __future__ import annotations

import pytest

API = "/api/v1"


async def _create_panel(app_client, headers, serial="REV-SN") -> str:  # type: ignore[no-untyped-def]
    r = await app_client.post(
        f"{API}/panels",
        json={"tag": "REV-01", "serial": serial, "name": "Rev Panel"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _audit_actions(company_id: str) -> list[str]:
    """Read audit_logs.action values for a company directly from the DB."""
    from sqlalchemy import text

    from panelos_api.db.session import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as session:
        rows = (
            await session.execute(
                text("SELECT action FROM audit_logs WHERE company_id = :cid"),
                {"cid": company_id},
            )
        ).all()
    return [r[0] for r in rows]


@pytest.mark.asyncio
async def test_draft_submit_approve_flips_active(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    company_id = owner_auth["seed"]["company_id"]
    pid = await _create_panel(app_client, headers)

    # Draft.
    r = await app_client.post(
        f"{API}/panels/{pid}/revisions",
        json={"change_summary": "first issue"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    rev1 = r.json()
    assert rev1["status"] == "draft"

    # Submit → review.
    r = await app_client.post(f"{API}/revisions/{rev1['id']}/submit", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "review"

    # Approve → approved + panel.active_revision_id set.
    r = await app_client.post(f"{API}/revisions/{rev1['id']}/approve", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "approved"

    r = await app_client.get(f"{API}/panels/{pid}", headers=headers)
    assert r.json()["active_revision_id"] == rev1["id"]

    actions = await _audit_actions(company_id)
    assert "revision.created" in actions
    assert "revision.submitted" in actions
    assert "revision.approved" in actions


@pytest.mark.asyncio
async def test_second_approval_supersedes_prior(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    company_id = owner_auth["seed"]["company_id"]
    pid = await _create_panel(app_client, headers, serial="REV-SN2")

    # First approved revision.
    r = await app_client.post(
        f"{API}/panels/{pid}/revisions", json={"change_summary": "A"}, headers=headers
    )
    rev_a = r.json()["id"]
    await app_client.post(f"{API}/revisions/{rev_a}/approve", headers=headers)

    # Second revision approved → supersedes A, flips active to B.
    r = await app_client.post(
        f"{API}/panels/{pid}/revisions", json={"change_summary": "B"}, headers=headers
    )
    rev_b = r.json()["id"]
    r = await app_client.post(f"{API}/revisions/{rev_b}/approve", headers=headers)
    assert r.status_code == 200, r.text

    # A is now superseded.
    r = await app_client.get(f"{API}/revisions/{rev_a}", headers=headers)
    assert r.json()["status"] == "superseded"

    # Panel points at B.
    r = await app_client.get(f"{API}/panels/{pid}", headers=headers)
    assert r.json()["active_revision_id"] == rev_b

    actions = await _audit_actions(company_id)
    assert "revision.superseded" in actions
