"""Panel CRUD + tenant isolation against a real Postgres container.

Tenant isolation is enforced two ways: the API layer scopes every query by the
caller's company (``PanelRepo(db, company_id)``) and Postgres RLS uses the
``app.company_id`` GUC. The container superuser owns the tables and therefore
*bypasses* RLS (Postgres does not FORCE RLS on table owners), so the assertions
here verify isolation at the API contract level — a second company cannot read,
update, or archive the first company's panels.
"""

from __future__ import annotations

import pytest

API = "/api/v1"


async def _second_company_auth(app_client, slug: str = "globex") -> dict[str, str]:
    """Bootstrap a second tenant + owner and return its auth headers."""
    from panelos_api.services import auth_service
    from panelos_api.db.session import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as session:
        company, _user, _m = await auth_service.signup_company_owner(
            session,
            company_name="Globex Corp",
            company_slug=slug,
            owner_email=f"owner@{slug}.io",
            owner_name="Gary Globex",
            password="GlobexPass123!",
        )
        await session.commit()
        company_id = str(company.id)

    r = await app_client.post(
        f"{API}/auth/login",
        json={"email": f"owner@{slug}.io", "password": "GlobexPass123!"},
    )
    assert r.status_code == 200, r.text
    return {
        "Authorization": f"Bearer {r.json()['access_token']}",
        "X-Company-Id": company_id,
    }


@pytest.mark.asyncio
async def test_panel_crud_lifecycle(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]

    # Create — includes the new `customer` field.
    payload = {
        "tag": "MCC-01",
        "serial": "SN-0001",
        "name": "Main MCC",
        "customer": "Northwind Foods",
        "voltage": "400V",
        "current_a": "630A",
        "ip_class": "IP54",
    }
    r = await app_client.post(f"{API}/panels", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    panel = r.json()
    pid = panel["id"]
    assert panel["customer"] == "Northwind Foods"
    assert panel["qr_token"]

    # List — tenant-scoped, returns our panel.
    r = await app_client.get(f"{API}/panels", headers=headers)
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert any(p["id"] == pid for p in items)

    # Get.
    r = await app_client.get(f"{API}/panels/{pid}", headers=headers)
    assert r.status_code == 200, r.text
    assert r.json()["serial"] == "SN-0001"

    # Update (incl. customer).
    r = await app_client.put(
        f"{API}/panels/{pid}",
        json={"name": "Main MCC (rev)", "customer": "Northwind Foods Ltd"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json()["name"] == "Main MCC (rev)"
    assert r.json()["customer"] == "Northwind Foods Ltd"

    # Archive (DELETE → 204) sets archived_at.
    r = await app_client.delete(f"{API}/panels/{pid}", headers=headers)
    assert r.status_code == 204, r.text
    r = await app_client.get(f"{API}/panels/{pid}", headers=headers)
    assert r.status_code == 200
    assert r.json()["archived_at"] is not None


@pytest.mark.asyncio
async def test_cross_tenant_isolation(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers_a = owner_auth["headers"]

    # Company A creates a panel.
    r = await app_client.post(
        f"{API}/panels",
        json={"tag": "A-01", "serial": "A-SN", "name": "A Panel"},
        headers=headers_a,
    )
    assert r.status_code == 201, r.text
    a_pid = r.json()["id"]

    # Company B (a different tenant) must not see or touch it.
    headers_b = await _second_company_auth(app_client)

    r = await app_client.get(f"{API}/panels", headers=headers_b)
    assert r.status_code == 200, r.text
    assert all(p["id"] != a_pid for p in r.json()["items"]), "B leaked A's panel in list"

    r = await app_client.get(f"{API}/panels/{a_pid}", headers=headers_b)
    assert r.status_code == 404, "B could read A's panel"

    r = await app_client.put(
        f"{API}/panels/{a_pid}", json={"name": "hijack"}, headers=headers_b
    )
    assert r.status_code == 404, "B could update A's panel"

    # A still sees it.
    r = await app_client.get(f"{API}/panels/{a_pid}", headers=headers_a)
    assert r.status_code == 200
