"""Panel Set → Panel → Section hierarchy against a real Postgres container.

Covers: panel-set CRUD, attaching a panel to a set, section create (auto-position)
+ delete, the assembled tree endpoint, and cross-tenant isolation of panel sets.
"""

from __future__ import annotations

import pytest

API = "/api/v1"


async def _second_company_auth(app_client, slug: str = "globex2") -> dict[str, str]:
    from panelos_api.db.session import get_sessionmaker
    from panelos_api.services import auth_service

    sm = get_sessionmaker()
    async with sm() as session:
        company, _user, _m = await auth_service.signup_company_owner(
            session,
            company_name="Globex Two",
            company_slug=slug,
            owner_email=f"owner@{slug}.io",
            owner_name="Gina Globex",
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
async def test_panel_set_panel_section_tree(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]

    # Create a panel set.
    r = await app_client.post(
        f"{API}/panel-sets",
        json={"name": "Water Treatment Plant", "code": "WTP"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    set_id = r.json()["id"]

    # Create a panel under the set.
    r = await app_client.post(
        f"{API}/panels",
        json={"tag": "WTP-BMCC", "serial": "WTP-BMCC-1", "name": "Blower MCC", "panel_set_id": set_id},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    panel = r.json()
    panel_id = panel["id"]
    assert panel["panel_set_id"] == set_id

    # Add two sections; the second auto-positions after the first.
    r = await app_client.post(
        f"{API}/panels/{panel_id}/sections",
        json={"section_type": "incoming", "name": "Incoming Section"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    assert r.json()["position"] == 0
    r = await app_client.post(
        f"{API}/panels/{panel_id}/sections",
        json={"section_type": "vfd", "name": "VFD Section"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    s2 = r.json()
    assert s2["position"] == 1
    assert s2["section_type"] == "vfd"

    # List sections — ordered by position.
    r = await app_client.get(f"{API}/panels/{panel_id}/sections", headers=headers)
    assert r.status_code == 200, r.text
    names = [s["name"] for s in r.json()]
    assert names == ["Incoming Section", "VFD Section"]

    # Tree: the set contains the panel which contains its sections.
    r = await app_client.get(f"{API}/panel-sets/tree", headers=headers)
    assert r.status_code == 200, r.text
    tree = r.json()
    the_set = next(s for s in tree["panel_sets"] if s["id"] == set_id)
    assert len(the_set["panels"]) == 1
    assert the_set["panels"][0]["id"] == panel_id
    assert len(the_set["panels"][0]["sections"]) == 2

    # Delete a section.
    r = await app_client.delete(f"{API}/sections/{s2['id']}", headers=headers)
    assert r.status_code == 204, r.text
    r = await app_client.get(f"{API}/panels/{panel_id}/sections", headers=headers)
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_unassigned_panels_in_tree(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    # Panel with no set lands in unassigned_panels.
    r = await app_client.post(
        f"{API}/panels",
        json={"tag": "LOOSE-1", "serial": "LOOSE-1", "name": "Loose Panel"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    pid = r.json()["id"]
    r = await app_client.get(f"{API}/panel-sets/tree", headers=headers)
    assert r.status_code == 200, r.text
    assert any(p["id"] == pid for p in r.json()["unassigned_panels"])


@pytest.mark.asyncio
async def test_quick_create_panel_name_only(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    """Name-only create: server derives a unique tag + serial + mints a QR token."""
    headers = owner_auth["headers"]
    r = await app_client.post(f"{API}/panels", json={"name": "Pump MCC"}, headers=headers)
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["tag"] == "PUMP-MCC"
    assert p["serial"].startswith("PUMP-MCC-")
    assert p["qr_token"]

    # Same name again → tag de-duplicated.
    r = await app_client.post(f"{API}/panels", json={"name": "Pump MCC"}, headers=headers)
    assert r.status_code == 201, r.text
    assert r.json()["tag"] == "PUMP-MCC-2"


@pytest.mark.asyncio
async def test_quick_create_section_defaults_custom(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    r = await app_client.post(f"{API}/panels", json={"name": "Board"}, headers=headers)
    pid = r.json()["id"]
    r = await app_client.post(
        f"{API}/panels/{pid}/sections", json={"name": "Spare Section"}, headers=headers
    )
    assert r.status_code == 201, r.text
    assert r.json()["section_type"] == "custom"


@pytest.mark.asyncio
async def test_section_move_between_panels(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    a = (await app_client.post(f"{API}/panels", json={"name": "Panel A"}, headers=headers)).json()
    b = (await app_client.post(f"{API}/panels", json={"name": "Panel B"}, headers=headers)).json()
    # Section in A.
    s = (
        await app_client.post(
            f"{API}/panels/{a['id']}/sections",
            json={"name": "Incoming", "section_type": "incoming"},
            headers=headers,
        )
    ).json()
    # Move to B.
    r = await app_client.post(
        f"{API}/sections/{s['id']}/move", json={"panel_id": b["id"]}, headers=headers
    )
    assert r.status_code == 200, r.text
    assert r.json()["panel_id"] == b["id"]
    # Gone from A, present in B.
    assert len((await app_client.get(f"{API}/panels/{a['id']}/sections", headers=headers)).json()) == 0
    b_secs = (await app_client.get(f"{API}/panels/{b['id']}/sections", headers=headers)).json()
    assert len(b_secs) == 1 and b_secs[0]["name"] == "Incoming"


@pytest.mark.asyncio
async def test_panel_move_preserves_qr(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    s1 = (await app_client.post(f"{API}/panel-sets", json={"name": "Set One"}, headers=headers)).json()
    s2 = (await app_client.post(f"{API}/panel-sets", json={"name": "Set Two"}, headers=headers)).json()
    p = (
        await app_client.post(
            f"{API}/panels", json={"name": "Mover", "panel_set_id": s1["id"]}, headers=headers
        )
    ).json()
    qr = p["qr_token"]
    # Move to set two via PUT panel_set_id.
    r = await app_client.put(
        f"{API}/panels/{p['id']}", json={"panel_set_id": s2["id"]}, headers=headers
    )
    assert r.status_code == 200, r.text
    moved = r.json()
    assert moved["panel_set_id"] == s2["id"]
    assert moved["qr_token"] == qr  # QR immutable across moves


@pytest.mark.asyncio
async def test_panel_set_tenant_isolation(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    r = await app_client.post(
        f"{API}/panel-sets", json={"name": "Private Facility"}, headers=headers
    )
    assert r.status_code == 201, r.text
    set_id = r.json()["id"]

    # A second company cannot read the first company's set or its tree entry.
    other = await _second_company_auth(app_client)
    r = await app_client.get(f"{API}/panel-sets/{set_id}", headers=other)
    assert r.status_code == 404, r.text
    r = await app_client.get(f"{API}/panel-sets/tree", headers=other)
    assert all(s["id"] != set_id for s in r.json()["panel_sets"])
