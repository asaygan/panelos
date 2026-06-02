"""Project → System Group → Panel → Cabinet hierarchy against a real Postgres.

Covers: 4-level CRUD, the assembled tree endpoint, lifecycle status on Project +
Group with status history, panel reparent across groups (qr_token preserved),
cabinet CRUD + move between panels, cross-tenant isolation.
"""

from __future__ import annotations

import pytest

API = "/api/v1"


async def _second_company_auth(app_client, slug: str = "globex-hr") -> dict[str, str]:
    from panelos_api.db.session import get_sessionmaker
    from panelos_api.services import auth_service

    sm = get_sessionmaker()
    async with sm() as session:
        company, _u, _m = await auth_service.signup_company_owner(
            session,
            company_name="Globex HR",
            company_slug=slug,
            owner_email=f"owner@{slug}.io",
            owner_name="Gina Globex",
            password="GlobexPass123!",
        )
        await session.commit()
        company_id = str(company.id)
    r = await app_client.post(
        f"{API}/auth/login", json={"email": f"owner@{slug}.io", "password": "GlobexPass123!"}
    )
    assert r.status_code == 200, r.text
    return {
        "Authorization": f"Bearer {r.json()['access_token']}",
        "X-Company-Id": company_id,
    }


@pytest.mark.asyncio
async def test_project_group_panel_cabinet_tree(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]

    # 1. Project
    r = await app_client.post(
        f"{API}/projects",
        json={"name": "Haddehane", "code": "HDH", "customer": "Eastgate", "site": "Buffalo, NY"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    project = r.json()
    pid = project["id"]
    assert project["lifecycle_status"] == "draft"

    # 2. System Group under the project
    r = await app_client.post(
        f"{API}/projects/{pid}/groups",
        json={"name": "MCC", "code": "MCC", "group_type": "mcc", "lifecycle_status": "engineering"},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    group = r.json()
    gid = group["id"]
    assert group["group_type"] == "mcc"
    assert group["lifecycle_status"] == "engineering"

    # 3. Panel under the group
    r = await app_client.post(
        f"{API}/panels",
        json={"name": "Paketleme MCC Panosu", "system_group_id": gid},
        headers=headers,
    )
    assert r.status_code == 201, r.text
    panel = r.json()
    panel_id = panel["id"]
    assert panel["system_group_id"] == gid
    assert panel["qr_token"]

    # 4. Two cabinets under the panel (auto position)
    for label in ["C1", "C2"]:
        r = await app_client.post(
            f"{API}/panels/{panel_id}/cabinets",
            json={"name": label, "code": label},
            headers=headers,
        )
        assert r.status_code == 201, r.text
    r = await app_client.get(f"{API}/panels/{panel_id}/cabinets", headers=headers)
    assert [c["code"] for c in r.json()] == ["C1", "C2"]

    # 5. Tree assembles 4 levels.
    r = await app_client.get(f"{API}/projects/tree", headers=headers)
    assert r.status_code == 200, r.text
    tree = r.json()
    proj_node = next(p for p in tree["projects"] if p["id"] == pid)
    assert len(proj_node["groups"]) == 1
    grp_node = proj_node["groups"][0]
    assert grp_node["id"] == gid
    assert len(grp_node["panels"]) == 1
    panel_node = grp_node["panels"][0]
    assert panel_node["id"] == panel_id
    assert len(panel_node["cabinets"]) == 2


@pytest.mark.asyncio
async def test_lifecycle_history_on_project_and_group(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]

    r = await app_client.post(f"{API}/projects", json={"name": "Site A"}, headers=headers)
    pid = r.json()["id"]
    # Initial history seeded.
    r = await app_client.get(f"{API}/projects/{pid}/status-history", headers=headers)
    assert r.status_code == 200, r.text
    assert len(r.json()) == 1
    assert r.json()[0]["to_status"] == "draft"

    # Transition project.
    r = await app_client.put(
        f"{API}/projects/{pid}", json={"lifecycle_status": "engineering"}, headers=headers
    )
    assert r.json()["lifecycle_status"] == "engineering"
    history = (
        await app_client.get(f"{API}/projects/{pid}/status-history", headers=headers)
    ).json()
    assert [h["to_status"] for h in history] == ["engineering", "draft"]
    assert history[0]["from_status"] == "draft"

    # Group + its history.
    r = await app_client.post(
        f"{API}/projects/{pid}/groups",
        json={"name": "MCC", "group_type": "mcc"},
        headers=headers,
    )
    gid = r.json()["id"]
    r = await app_client.put(
        f"{API}/system-groups/{gid}", json={"lifecycle_status": "commissioned"}, headers=headers
    )
    assert r.json()["lifecycle_status"] == "commissioned"
    ghist = (
        await app_client.get(f"{API}/system-groups/{gid}/status-history", headers=headers)
    ).json()
    assert [h["to_status"] for h in ghist] == ["commissioned", "draft"]


@pytest.mark.asyncio
async def test_panel_reparent_preserves_qr(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    r = await app_client.post(f"{API}/projects", json={"name": "Site"}, headers=headers)
    pid = r.json()["id"]
    g1 = (
        await app_client.post(
            f"{API}/projects/{pid}/groups",
            json={"name": "MCC", "group_type": "mcc"},
            headers=headers,
        )
    ).json()
    g2 = (
        await app_client.post(
            f"{API}/projects/{pid}/groups",
            json={"name": "PLC", "group_type": "plc"},
            headers=headers,
        )
    ).json()
    panel = (
        await app_client.post(
            f"{API}/panels",
            json={"name": "Mover", "system_group_id": g1["id"]},
            headers=headers,
        )
    ).json()
    qr = panel["qr_token"]
    r = await app_client.put(
        f"{API}/panels/{panel['id']}",
        json={"system_group_id": g2["id"]},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    moved = r.json()
    assert moved["system_group_id"] == g2["id"]
    assert moved["qr_token"] == qr


@pytest.mark.asyncio
async def test_cabinet_move_between_panels(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    a = (await app_client.post(f"{API}/panels", json={"name": "Panel A"}, headers=headers)).json()
    b = (await app_client.post(f"{API}/panels", json={"name": "Panel B"}, headers=headers)).json()
    cab = (
        await app_client.post(
            f"{API}/panels/{a['id']}/cabinets",
            json={"name": "C1", "code": "C1"},
            headers=headers,
        )
    ).json()
    r = await app_client.post(
        f"{API}/cabinets/{cab['id']}/move", json={"panel_id": b["id"]}, headers=headers
    )
    assert r.status_code == 200, r.text
    assert r.json()["panel_id"] == b["id"]
    assert len((await app_client.get(f"{API}/panels/{a['id']}/cabinets", headers=headers)).json()) == 0
    assert len((await app_client.get(f"{API}/panels/{b['id']}/cabinets", headers=headers)).json()) == 1


@pytest.mark.asyncio
async def test_tenant_isolation_for_projects(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    headers = owner_auth["headers"]
    r = await app_client.post(f"{API}/projects", json={"name": "Private"}, headers=headers)
    pid = r.json()["id"]
    other = await _second_company_auth(app_client)
    r = await app_client.get(f"{API}/projects/{pid}", headers=other)
    assert r.status_code == 404, r.text
    r = await app_client.get(f"{API}/projects/tree", headers=other)
    assert all(p["id"] != pid for p in r.json()["projects"])
