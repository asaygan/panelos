"""Issues, maintenance, attachments, notifications and the approval policy."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from tests.conftest import add_member

API = "/api/v1"
JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00" + b"\x00" * 64
PDF = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


async def _panel(app_client, headers, tag="FW-01", **extra) -> str:  # type: ignore[no-untyped-def]
    r = await app_client.post(
        f"{API}/panels",
        json={"tag": tag, "serial": f"{tag}-SN", "name": f"Panel {tag}", **extra},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _upload(app_client, headers, name, content_type, body):  # type: ignore[no-untyped-def]
    r = await app_client.post(
        f"{API}/files/presign",
        json={"filename": name, "content_type": content_type},
        headers=headers,
    )
    if r.status_code != 200:
        return r
    key = r.json()["key"]
    await app_client.put(
        f"{API}/files/upload/{key}", content=body, headers={"Content-Type": content_type}
    )
    return await app_client.post(
        f"{API}/files/finalize", json={"key": key, "original_filename": name}, headers=headers
    )


@pytest.mark.asyncio
async def test_issue_lifecycle_with_photos_and_notifications(  # type: ignore[no-untyped-def]
    app_client, owner_auth, outbox_mail
) -> None:
    owner = owner_auth["headers"]
    tech = await add_member(app_client, owner, "tech@acmeco.io", "technician")
    viewer = await add_member(app_client, owner, "viewer@acmeco.io", "viewer")
    pid = await _panel(app_client, owner)
    outbox_mail.clear()

    # A technician can upload a photo but not a schematic PDF.
    assert (await _upload(app_client, tech, "s.pdf", "application/pdf", PDF)).status_code == 403
    photo = await _upload(app_client, tech, "burn.jpg", "image/jpeg", JPEG)
    assert photo.status_code == 200, photo.text

    # Viewers cannot report.
    r = await app_client.post(
        f"{API}/panels/{pid}/issues", json={"title": "Smell of burning"}, headers=viewer
    )
    assert r.status_code == 403

    r = await app_client.post(
        f"{API}/panels/{pid}/issues",
        json={
            "title": "Busbar discoloration",
            "description": "L2 phase, top section",
            "severity": "high",
            "file_ids": [photo.json()["id"]],
        },
        headers=tech,
    )
    assert r.status_code == 201, r.text
    issue = r.json()
    assert (issue["number"], issue["status"], issue["attachment_count"]) == (1, "open", 1)
    assert issue["reported_by_name"] == "tech"

    # The owner (manager) is notified in-app and by email; the reporter is not.
    mails = await outbox_mail.settle()
    assert [m.to for m in mails] == [owner_auth["seed"]["email"]]
    assert "Busbar discoloration" in mails[0].subject
    r = await app_client.get(f"{API}/notifications", headers=owner)
    notes = r.json()
    assert notes["unread"] == 1 and notes["items"][0]["kind"] == "issue_reported"
    assert notes["items"][0]["link"] == f"/issues/{issue['id']}"
    assert (await app_client.get(f"{API}/notifications", headers=tech)).json()["unread"] == 0

    # Assign → goes in progress and the assignee is told.
    r = await app_client.patch(
        f"{API}/issues/{issue['id']}",
        json={"assigned_to": (await app_client.get(f"{API}/auth/me", headers=tech)).json()["id"]},
        headers=owner,
    )
    assert r.status_code == 200 and r.json()["status"] == "in_progress", r.text
    assert (await app_client.get(f"{API}/notifications", headers=tech)).json()["unread"] == 1

    # The technician cannot close, but can resolve by logging the repair.
    r = await app_client.patch(
        f"{API}/issues/{issue['id']}", json={"status": "closed"}, headers=tech
    )
    assert r.status_code == 403
    r = await app_client.post(
        f"{API}/panels/{pid}/maintenance",
        json={
            "kind": "corrective",
            "result": "ok",
            "summary": "Re-torqued L2 joint, thermal scan clean",
            "issue_id": issue["id"],
            "resolve_issue": True,
        },
        headers=tech,
    )
    assert r.status_code == 201, r.text

    detail = (await app_client.get(f"{API}/issues/{issue['id']}", headers=owner)).json()
    assert detail["status"] == "resolved" and detail["resolved_at"]
    assert detail["attachments"][0]["mime"] == "image/jpeg"
    assert detail["attachments"][0]["url"]

    # Panel + dashboard reflect it.
    panel = (await app_client.get(f"{API}/panels/{pid}", headers=owner)).json()
    assert panel["open_issue_count"] == 0
    dash = (await app_client.get(f"{API}/dashboard", headers=owner)).json()
    assert dash["issues"]["open"] == 0 and dash["issues"]["resolved_30d"] == 1
    assert dash["maintenance"]["done_30d"] == 1

    r = await app_client.post(f"{API}/notifications/read-all", headers=owner)
    assert r.status_code == 200
    assert (await app_client.get(f"{API}/notifications/unread-count", headers=owner)).json() == {
        "unread": 0
    }


@pytest.mark.asyncio
async def test_maintenance_plan_cycle_and_reminder(app_client, owner_auth, outbox_mail) -> None:  # type: ignore[no-untyped-def]
    owner = owner_auth["headers"]
    pid = await _panel(app_client, owner, tag="MP-01")
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    r = await app_client.post(
        f"{API}/panels/{pid}/maintenance-plans",
        json={
            "title": "Annual thermography",
            "kind": "thermography",
            "interval_days": 365,
            "next_due_on": yesterday,
        },
        headers=owner,
    )
    assert r.status_code == 201, r.text
    plan = r.json()
    assert plan["days_until_due"] == -1

    panel = (await app_client.get(f"{API}/panels/{pid}", headers=owner)).json()
    assert panel["maintenance_overdue"] is True
    overdue = (await app_client.get(f"{API}/maintenance-plans?due=overdue", headers=owner)).json()
    assert [p["id"] for p in overdue] == [plan["id"]]
    dash = (await app_client.get(f"{API}/dashboard", headers=owner)).json()
    assert dash["maintenance"]["overdue"] == 1
    assert any(a["kind"] == "maintenance_overdue" for a in dash["attention"])

    # The scheduler announces a due plan exactly once per cycle.
    from panelos_api.main import run_scheduled_jobs

    outbox_mail.clear()
    assert await run_scheduled_jobs() == 1
    assert await run_scheduled_jobs() == 0
    mails = await outbox_mail.settle()
    assert len(mails) == 1 and "Annual thermography" in mails[0].subject

    # Doing the work moves the plan one interval ahead and re-arms the reminder.
    done_at = datetime.now(UTC).replace(microsecond=0)
    r = await app_client.post(
        f"{API}/panels/{pid}/maintenance",
        json={
            "summary": "Thermal scan, no hot spots",
            "plan_id": plan["id"],
            "performed_at": done_at.isoformat(),
        },
        headers=owner,
    )
    assert r.status_code == 201, r.text
    assert r.json()["kind"] == "thermography"  # inherited from the plan
    plans = (await app_client.get(f"{API}/maintenance-plans", headers=owner)).json()
    assert plans[0]["next_due_on"] == (done_at.date() + timedelta(days=365)).isoformat()
    assert (await app_client.get(f"{API}/panels/{pid}", headers=owner)).json()[
        "maintenance_overdue"
    ] is False

    # A plan with history can't be deleted, only retired.
    r = await app_client.delete(f"{API}/maintenance-plans/{plan['id']}", headers=owner)
    assert r.status_code == 409 and r.json()["code"] == "plan_in_use"
    r = await app_client.patch(
        f"{API}/maintenance-plans/{plan['id']}", json={"active": False}, headers=owner
    )
    assert r.status_code == 200 and r.json()["active"] is False

    r = await app_client.post(
        f"{API}/panels/{pid}/maintenance",
        json={
            "summary": "from the future",
            "performed_at": (datetime.now(UTC) + timedelta(days=2)).isoformat(),
        },
        headers=owner,
    )
    assert r.status_code == 422 and r.json()["code"] == "date_in_future"


@pytest.mark.asyncio
async def test_approval_policy_and_revision_notifications(  # type: ignore[no-untyped-def]
    app_client, owner_auth, outbox_mail
) -> None:
    owner = owner_auth["headers"]
    eng = await add_member(app_client, owner, "eng@acmeco.io", "engineer")
    pid = await _panel(app_client, owner, tag="AP-01")

    async def draft(headers) -> str:  # type: ignore[no-untyped-def]
        r = await app_client.post(
            f"{API}/panels/{pid}/revisions", json={"change_summary": "x"}, headers=headers
        )
        assert r.status_code == 201, r.text
        return r.json()["id"]

    # Four-eyes: the author cannot approve their own revision.
    r = await app_client.put(f"{API}/companies/me", json={"require_four_eyes": True}, headers=owner)
    assert r.status_code == 200 and r.json()["require_four_eyes"] is True
    rev = await draft(eng)
    outbox_mail.clear()
    assert (await app_client.post(f"{API}/revisions/{rev}/submit", headers=eng)).status_code == 200
    # Approvers hear about the submission.
    assert [m.to for m in await outbox_mail.settle()] == [owner_auth["seed"]["email"]]
    r = await app_client.post(f"{API}/revisions/{rev}/approve", headers=eng)
    assert r.status_code == 403 and r.json()["code"] == "four_eyes_required"

    outbox_mail.clear()
    r = await app_client.post(
        f"{API}/revisions/{rev}/reject", json={"note": "Sheet 3 is missing"}, headers=owner
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["review_note"], body["rejected_by_name"]) == ("Sheet 3 is missing", "Olivia Owner")
    mails = await outbox_mail.settle()
    assert [m.to for m in mails] == ["eng@acmeco.io"] and "Sheet 3 is missing" in mails[0].text

    # Engineers can be barred from approving altogether.
    r = await app_client.put(
        f"{API}/companies/me",
        json={"require_four_eyes": False, "engineer_can_approve": False},
        headers=owner,
    )
    assert r.status_code == 200
    rev2 = await draft(owner)
    r = await app_client.post(f"{API}/revisions/{rev2}/approve", headers=eng)
    assert r.status_code == 403 and r.json()["code"] == "approval_not_allowed"
    r = await app_client.post(f"{API}/revisions/{rev2}/approve", headers=owner)
    assert r.status_code == 200

    panel = (await app_client.get(f"{API}/panels/{pid}", headers=owner)).json()
    assert panel["doc_status"] == "approved" and panel["active_revision"]["letter"] == "B"
    queue = (await app_client.get(f"{API}/revisions?filter=history", headers=owner)).json()
    assert {q["status"] for q in queue} == {"approved", "rejected"}
    assert all(q["panel_tag"] == "AP-01" for q in queue)


@pytest.mark.asyncio
async def test_location_scoped_member_sees_only_their_sites(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    owner = owner_auth["headers"]
    locs = {}
    for code in ("IST", "ANK"):
        r = await app_client.post(
            f"{API}/companies/me/locations", json={"code": code, "name": code}, headers=owner
        )
        locs[code] = r.json()["id"]
    ist = await _panel(app_client, owner, tag="IST-01", location_id=locs["IST"])
    ank = await _panel(app_client, owner, tag="ANK-01", location_id=locs["ANK"])

    tech = await add_member(app_client, owner, "ist.tech@acmeco.io", "technician")
    members = (await app_client.get(f"{API}/users", headers=owner)).json()
    mid = next(m["membership_id"] for m in members if m["email"] == "ist.tech@acmeco.io")
    r = await app_client.put(
        f"{API}/users/{mid}/locations", json={"location_ids": [locs["IST"]]}, headers=owner
    )
    assert r.status_code in (200, 204), r.text

    tags = [p["tag"] for p in (await app_client.get(f"{API}/panels", headers=tech)).json()["items"]]
    assert tags == ["IST-01"]
    assert (await app_client.get(f"{API}/panels/{ist}", headers=tech)).status_code == 200
    assert (await app_client.get(f"{API}/panels/{ank}", headers=tech)).status_code == 404
    r = await app_client.post(
        f"{API}/panels/{ank}/issues", json={"title": "not my site"}, headers=tech
    )
    assert r.status_code == 404
    hits = (await app_client.get(f"{API}/search?q=01", headers=tech)).json()["items"]
    assert {h["title"].split(" ")[0] for h in hits if h["type"] == "panel"} == {"IST-01"}
    assert (await app_client.get(f"{API}/dashboard", headers=tech)).json()["counts"]["panels"] == 1
    # The owner still sees everything.
    assert (await app_client.get(f"{API}/dashboard", headers=owner)).json()["counts"]["panels"] == 2
