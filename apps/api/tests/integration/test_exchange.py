"""Import / export and global search."""

from __future__ import annotations

import io

import pytest

API = "/api/v1"

CSV = (
    "Proje;Sistem Grubu;Etiket;Pano Adı;Seri No;Gerilim;Not\n"
    "Tesis A;MCC;MCC-01;Motor Kontrol 1;SN-100;400 V;ilk\n"
    "Tesis A;MCC;MCC-02;Motor Kontrol 2;SN-101;400 V;\n"
    "Tesis B;;DP-01;Dağıtım Panosu;SN-200;230 V;=cmd()\n"
).encode()


@pytest.mark.asyncio
async def test_import_preview_then_commit_then_export(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    h = owner_auth["headers"]

    # A bad sheet is reported row by row and nothing is written.
    bad = b"name,serial\nA,S1\n,S2\nB,S1\n"
    r = await app_client.post(
        f"{API}/import/panels?dry_run=false", files={"file": ("p.csv", bad, "text/csv")}, headers=h
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["committed"] is False and body["failed"] == 2
    assert body["rows"][1]["errors"] == ["name_required"]
    assert body["rows"][2]["errors"] == ["duplicate_serial_in_file"]
    assert (await app_client.get(f"{API}/panels", headers=h)).json()["items"] == []

    # Turkish headers + semicolons (Excel TR) are understood. Dry run writes nothing.
    r = await app_client.post(
        f"{API}/import/panels", files={"file": ("panolar.csv", CSV, "text/csv")}, headers=h
    )
    body = r.json()
    assert (body["committed"], body["created"], body["failed"]) == (False, 3, 0), body
    assert (await app_client.get(f"{API}/panels", headers=h)).json()["items"] == []

    r = await app_client.post(
        f"{API}/import/panels?dry_run=false",
        files={"file": ("panolar.csv", CSV, "text/csv")},
        headers=h,
    )
    assert r.json()["committed"] is True, r.text
    tree = (await app_client.get(f"{API}/projects/tree", headers=h)).json()
    names = {p["name"]: [g["name"] for g in p["groups"]] for p in tree["projects"]}
    assert names == {"Tesis A": ["MCC"], "Tesis B": ["General"]}

    # Re-importing the same serials updates instead of duplicating.
    changed = CSV.replace(b"Motor Kontrol 1", b"Motor Kontrol 1 (yeni)")
    r = await app_client.post(
        f"{API}/import/panels?dry_run=false",
        files={"file": ("panolar.csv", changed, "text/csv")},
        headers=h,
    )
    assert (r.json()["created"], r.json()["updated"]) == (0, 3)
    items = (await app_client.get(f"{API}/panels", headers=h)).json()["items"]
    assert len(items) == 3
    assert any(
        p["name"] == "Motor Kontrol 1 (yeni)" and p["project_name"] == "Tesis A" for p in items
    )

    # Export: CSV neutralizes formula cells; XLSX round-trips through the importer.
    r = await app_client.get(f"{API}/export/panels?format=csv", headers=h)
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    text = r.content.decode("utf-8-sig")
    assert "'=cmd()" in text and "/q/" in text
    r = await app_client.get(f"{API}/export/panels?format=xlsx", headers=h)
    assert r.content[:2] == b"PK"
    from openpyxl import load_workbook

    ws = load_workbook(io.BytesIO(r.content)).active
    assert ws.max_row == 4 and ws["C2"].value in {"MCC-01", "MCC-02", "DP-01"}

    r = await app_client.post(
        f"{API}/import/panels",
        files={"file": ("export.xlsx", r.content, "application/octet-stream")},
        headers=h,
    )
    assert (r.json()["updated"], r.json()["failed"]) == (3, 0), r.text

    for path in ("issues", "maintenance", "audit-logs"):
        assert (await app_client.get(f"{API}/export/{path}", headers=h)).status_code == 200
    tmpl = await app_client.get(f"{API}/import/panels/template?format=csv", headers=h)
    assert tmpl.content.decode("utf-8-sig").startswith("project,system_group,tag,name,serial")


@pytest.mark.asyncio
async def test_search_covers_the_hierarchy(app_client, owner_auth) -> None:  # type: ignore[no-untyped-def]
    h = owner_auth["headers"]
    await app_client.post(
        f"{API}/import/panels?dry_run=false",
        files={"file": ("p.csv", CSV, "text/csv")},
        headers=h,
    )
    types = lambda q: {  # noqa: E731
        i["type"] for i in app_client_results[q]
    }
    app_client_results = {}
    for q in ("Motor", "Tesis", "MCC", "x"):
        app_client_results[q] = (
            await app_client.get(f"{API}/search", params={"q": q}, headers=h)
        ).json()["items"]
    assert types("Motor") == {"panel"}
    assert types("Tesis") == {"project"}
    assert types("MCC") == {"panel", "system_group"}
    assert app_client_results["x"] == []  # too short
    assert all({"title", "href", "id"} <= set(i) for i in app_client_results["MCC"])
    # LIKE wildcards are literal.
    r = await app_client.get(f"{API}/search", params={"q": "%%"}, headers=h)
    assert r.json()["items"] == []
