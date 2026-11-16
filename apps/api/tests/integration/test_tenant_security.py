"""Security regressions: cross-tenant access, membership status, frozen revisions.

Each test pins one hole that used to be open:

* revisions / sheets / components reachable across companies,
* suspended or not-yet-accepted members keeping full access,
* approved revisions still being editable,
* foreign keys and storage keys pointing at another tenant's rows/objects.
"""

from __future__ import annotations

import pytest

API = "/api/v1"
PDF_BYTES = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"


async def _second_company_auth(app_client, slug: str = "globex") -> dict[str, str]:  # type: ignore[no-untyped-def]
    from panelos_api.db.session import get_sessionmaker
    from panelos_api.services import auth_service

    email, password = f"owner@{slug}.io", "OtherPass123!"
    sm = get_sessionmaker()
    async with sm() as session:
        company, _u, _m = await auth_service.signup_company_owner(
            session,
            company_name=slug.title(),
            company_slug=slug,
            owner_email=email,
            owner_name="Other Owner",
            password=password,
        )
        await session.commit()
        cid = str(company.id)
    r = await app_client.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}", "X-Company-Id": cid}


async def _panel_with_draft(app_client, headers, tag: str) -> tuple[str, str]:  # type: ignore[no-untyped-def]
    r = await app_client.post(
        f"{API}/panels", json={"tag": tag, "serial": f"{tag}-SN", "name": tag}, headers=headers
    )
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    r = await app_client.post(
        f"{API}/panels/{pid}/revisions", json={"change_summary": "x"}, headers=headers
    )
    assert r.status_code == 201, r.text
    return pid, r.json()["id"]


async def _upload(app_client, headers, name: str = "s.pdf", body: bytes = PDF_BYTES) -> dict:  # type: ignore[no-untyped-def,type-arg]
    r = await app_client.post(
        f"{API}/files/presign",
        json={"filename": name, "content_type": "application/pdf"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    key = r.json()["key"]
    r = await app_client.put(
        f"{API}/files/upload/{key}", content=body, headers={"Content-Type": "application/pdf"}
    )
    assert r.status_code == 200, r.text
    r = await app_client.post(
        f"{API}/files/finalize",
        json={"key": key, "original_filename": name},
        headers=headers,
    )
    return {"key": key, "response": r}


async def _set_membership_status(membership_id: str, status: str) -> None:
    from sqlalchemy import text

    from panelos_api.db.session import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as session:
        await session.execute(
            text("UPDATE memberships SET status = :s WHERE id = :id"),
            {"s": status, "id": membership_id},
        )
        await session.commit()


# --------------------------------------------------------------------------
# Cross-tenant
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_revision_queue_and_detail_are_tenant_scoped(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    a = owner_auth["headers"]
    _pid, rev_a = await _panel_with_draft(app_client, a, "A-01")
    b = await _second_company_auth(app_client)
    _pid_b, rev_b = await _panel_with_draft(app_client, b, "B-01")

    queue_b = (await app_client.get(f"{API}/revisions", headers=b)).json()
    assert [r["id"] for r in queue_b] == [rev_b]
    queue_a = (await app_client.get(f"{API}/revisions", headers=a)).json()
    assert [r["id"] for r in queue_a] == [rev_a]

    assert (await app_client.get(f"{API}/revisions/{rev_a}", headers=b)).status_code == 404
    assert (await app_client.get(f"{API}/revisions/{rev_a}", headers=a)).status_code == 200


@pytest.mark.asyncio
async def test_sheets_cannot_cross_tenants(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    a = owner_auth["headers"]
    pid_a, rev_a = await _panel_with_draft(app_client, a, "A-02")
    file_a = (await _upload(app_client, a))["response"].json()["id"]
    r = await app_client.post(
        f"{API}/files/panels/{pid_a}/revisions/{rev_a}/sheets",
        json={"file_id": file_a, "sheet_number": "1", "sheet_title": "A"},
        headers=a,
    )
    assert r.status_code == 201, r.text

    b = await _second_company_auth(app_client)
    pid_b, rev_b = await _panel_with_draft(app_client, b, "B-02")
    file_b = (await _upload(app_client, b))["response"].json()["id"]

    # B attaching to A's revision (via A's panel, or via its own panel in the path).
    for panel in (pid_a, pid_b):
        r = await app_client.post(
            f"{API}/files/panels/{panel}/revisions/{rev_a}/sheets",
            json={"file_id": file_b, "sheet_number": "9", "sheet_title": "evil"},
            headers=b,
        )
        assert r.status_code == 404, r.text
    # B attaching A's file to its own revision.
    r = await app_client.post(
        f"{API}/files/panels/{pid_b}/revisions/{rev_b}/sheets",
        json={"file_id": file_a, "sheet_number": "9", "sheet_title": "stolen"},
        headers=b,
    )
    assert r.status_code == 404, r.text
    # B listing A's sheets through its own panel.
    r = await app_client.get(f"{API}/panels/{pid_b}/sheets?revision_id={rev_a}", headers=b)
    assert r.status_code == 404, r.text
    # B fetching A's file.
    assert (await app_client.get(f"{API}/files/{file_a}", headers=b)).status_code == 404


@pytest.mark.asyncio
async def test_finalize_rejects_foreign_key_and_bad_content(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    a = owner_auth["headers"]
    up = await _upload(app_client, a)
    assert up["response"].status_code == 200, up["response"].text
    assert up["response"].json()["mime"] == "application/pdf"
    assert len(up["response"].json()["sha256"]) in (0, 64)

    b = await _second_company_auth(app_client)
    r = await app_client.post(f"{API}/files/finalize", json={"key": up["key"]}, headers=b)
    assert r.status_code == 404, r.text

    # Not actually a PDF.
    bad = await _upload(app_client, a, name="x.pdf", body=b"MZ\x90\x00 not a pdf")
    assert bad["response"].status_code == 422, bad["response"].text

    # Hostile filename never reaches the storage key.
    r = await app_client.post(
        f"{API}/files/presign",
        json={"filename": "../../etc/pa ss?wd.pdf", "content_type": "application/pdf"},
        headers=a,
    )
    key = r.json()["key"]
    assert ".." not in key and " " not in key and "?" not in key
    assert key.startswith(f"uploads/{owner_auth['seed']['company_id']}/")

    r = await app_client.post(
        f"{API}/files/presign",
        json={"filename": "a.exe", "content_type": "application/x-msdownload"},
        headers=a,
    )
    assert r.status_code == 422, r.text


@pytest.mark.asyncio
async def test_foreign_keys_must_belong_to_company(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    a = owner_auth["headers"]
    b = await _second_company_auth(app_client)
    r = await app_client.post(f"{API}/projects", json={"name": "B project"}, headers=b)
    assert r.status_code == 201, r.text
    r = await app_client.post(
        f"{API}/projects/{r.json()['id']}/groups", json={"name": "B group"}, headers=b
    )
    assert r.status_code == 201, r.text
    group_b = r.json()["id"]
    r = await app_client.post(
        f"{API}/companies/me/locations", json={"name": "B site", "code": "BS"}, headers=b
    )
    assert r.status_code == 201, r.text
    loc_b = r.json()["id"]

    r = await app_client.post(
        f"{API}/panels", json={"name": "sneaky", "system_group_id": group_b}, headers=a
    )
    assert r.status_code == 404, r.text
    r = await app_client.post(f"{API}/panels", json={"name": "ok"}, headers=a)
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    for change in ({"system_group_id": group_b}, {"location_id": loc_b}):
        r = await app_client.put(f"{API}/panels/{pid}", json=change, headers=a)
        assert r.status_code == 404, (change, r.text)
    r = await app_client.post(
        f"{API}/projects", json={"name": "p", "location_id": loc_b}, headers=a
    )
    assert r.status_code == 404, r.text

    r = await app_client.put(
        f"{API}/companies/me", json={"logo_key": "uploads/other/x/logo.png"}, headers=a
    )
    assert r.status_code == 422, r.text


# --------------------------------------------------------------------------
# Membership status
# --------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("status", ["suspended", "invited"])
async def test_inactive_membership_has_no_access(app_client, owner_auth, status) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    assert (await app_client.get(f"{API}/panels", headers=headers)).status_code == 200
    await _set_membership_status(owner_auth["seed"]["membership_id"], status)
    assert (await app_client.get(f"{API}/panels", headers=headers)).status_code == 403
    # Also without the explicit company header.
    bare = {"Authorization": headers["Authorization"]}
    assert (await app_client.get(f"{API}/panels", headers=bare)).status_code == 403


@pytest.mark.asyncio
async def test_bad_company_header_is_403_not_500(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = {**owner_auth["headers"], "X-Company-Id": "not-a-uuid"}
    assert (await app_client.get(f"{API}/panels", headers=headers)).status_code == 403


@pytest.mark.asyncio
async def test_refresh_rejected_for_disabled_user(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    from sqlalchemy import text

    from panelos_api.db.session import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as session:
        await session.execute(
            text("UPDATE users SET is_active = false WHERE id = :id"),
            {"id": owner_auth["seed"]["user_id"]},
        )
        await session.commit()
    r = await app_client.post(
        f"{API}/auth/refresh", json={"refresh_token": owner_auth["tokens"]["refresh_token"]}
    )
    assert r.status_code == 401, r.text


# --------------------------------------------------------------------------
# Frozen revisions
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_non_draft_revision_is_frozen(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    h = owner_auth["headers"]
    pid, rev = await _panel_with_draft(app_client, h, "FRZ-01")
    file_id = (await _upload(app_client, h))["response"].json()["id"]
    r = await app_client.post(
        f"{API}/files/panels/{pid}/revisions/{rev}/sheets",
        json={"file_id": file_id, "sheet_number": "1", "sheet_title": "one"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    sheet_id = r.json()["id"]
    r = await app_client.post(
        f"{API}/revisions/{rev}/components",
        json={"slot": "1", "ref": "Q1", "description": "breaker"},
        headers=h,
    )
    assert r.status_code == 201, r.text
    comp_id = r.json()["id"]

    assert (await app_client.post(f"{API}/revisions/{rev}/approve", headers=h)).status_code == 200

    calls = [
        app_client.post(
            f"{API}/files/panels/{pid}/revisions/{rev}/sheets",
            json={"file_id": file_id, "sheet_number": "2", "sheet_title": "two"},
            headers=h,
        ),
        app_client.patch(f"{API}/files/sheets/{sheet_id}", json={"sheet_title": "x"}, headers=h),
        app_client.delete(f"{API}/files/sheets/{sheet_id}", headers=h),
        app_client.post(
            f"{API}/revisions/{rev}/components",
            json={"slot": "2", "ref": "Q2", "description": "b"},
            headers=h,
        ),
        app_client.put(f"{API}/components/{comp_id}", json={"description": "x"}, headers=h),
        app_client.delete(f"{API}/components/{comp_id}", headers=h),
    ]
    for call in calls:
        r = await call
        assert r.status_code == 409, r.text
    # Still readable.
    assert len((await app_client.get(f"{API}/panels/{pid}/sheets", headers=h)).json()) == 1
    assert len((await app_client.get(f"{API}/revisions/{rev}/components", headers=h)).json()) == 1


# --------------------------------------------------------------------------
# Bootstrap + removed surface
# --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bootstrap_disabled_by_default(app_client) -> None:  # type: ignore[no-untyped-def]
    r = await app_client.post(
        f"{API}/auth/bootstrap", json={"email": "x@evil.io", "password": "Password123!"}
    )
    assert r.status_code == 404, r.text


@pytest.mark.asyncio
async def test_webhook_stub_is_gone(app_client) -> None:  # type: ignore[no-untyped-def]
    assert (await app_client.post(f"{API}/webhooks/anything", content=b"{}")).status_code == 404
