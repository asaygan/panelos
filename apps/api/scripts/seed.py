"""Seed PanelOS with a realistic 4-level industrial asset structure.

  - 1 company (NorthForge Automation)
  - 7 users (Mara, Dan, Priya, Erik, Sofia, James, Lena -- Lena is invited)
  - 5 locations (one per facility)
  - 5 Projects (facilities): Water Treatment Plant, Steel Melt Shop,
    Paper Machine Line 3, Biogas Plant, Packaging Machine
  - 12 System Groups (typed: MCC, LVDP, PLC, PFC, MV, UPS, SCADA, DCS, CUSTOM)
  - 18 panels distributed across the groups (no panel.status; lifecycle lives
    on Project + Group)
  - Cabinets per panel (C1/C2/…)
  - For the Blower MCC (WTP-BMCC): 5 revisions (A-E), 10 components, 10 sheets
  - 4 queued revision requests (draft/review status)

Usage:
    uv run python scripts/seed.py --reset
"""

from __future__ import annotations

import argparse
import asyncio
import io
from datetime import UTC, datetime, timedelta
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import text

from panelos_api.core.ids import new_qr_token
from panelos_api.core.rbac import Role
from panelos_api.core.security import hash_password
from panelos_api.db.models.cabinet import Cabinet
from panelos_api.db.models.company import Company
from panelos_api.db.models.component import Component
from panelos_api.db.models.label_template import LabelTemplate
from panelos_api.db.models.lifecycle import LifecycleStatus
from panelos_api.db.models.location import Location
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.panel import Panel
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.db.models.pdf_file import PdfFile
from panelos_api.db.models.project import Project
from panelos_api.db.models.revision_file import RevisionFile
from panelos_api.db.models.system_group import GroupType, SystemGroup
from panelos_api.db.models.user import User
from panelos_api.db.session import dispose_engine, get_sessionmaker

PASSWORD = "panelos123"

USERS: list[dict[str, str]] = [
    {"key": "u1", "name": "Mara Voss", "email": "m.voss@northforge.io", "role": "Owner", "status": "active"},
    {"key": "u2", "name": "Dan Okafor", "email": "d.okafor@northforge.io", "role": "Engineer", "status": "active"},
    {"key": "u3", "name": "Priya Raman", "email": "p.raman@northforge.io", "role": "Engineer", "status": "active"},
    {"key": "u4", "name": "Erik Lund", "email": "e.lund@northforge.io", "role": "Technician", "status": "active"},
    {"key": "u5", "name": "Sofia Marchetti", "email": "s.marchetti@northforge.io", "role": "Technician", "status": "active"},
    {"key": "u6", "name": "James Whitfield", "email": "j.whitfield@acme-mfg.com", "role": "Viewer", "status": "active"},
    {"key": "u7", "name": "Lena Hoffmann", "email": "l.hoffmann@northforge.io", "role": "Engineer", "status": "invited"},
]

LOCATIONS = [
    {"key": "l_wtp", "name": "Riverside Water Treatment", "code": "WTP", "region": "Hamilton, ON"},
    {"key": "l_sms", "name": "Eastgate Steel Works", "code": "STL", "region": "Buffalo, NY"},
    {"key": "l_pm3", "name": "Northmill Paper Plant", "code": "PPR", "region": "Hamilton, ON"},
    {"key": "l_bgp", "name": "Green Valley Biogas", "code": "BIO", "region": "Welland, ON"},
    {"key": "l_pkg", "name": "Lakeside Packaging", "code": "PKG", "region": "Burlington, ON"},
]

# Projects = facilities (top of the asset tree).
PROJECTS = [
    {"key": "wtp", "name": "Water Treatment Plant", "code": "WTP", "loc": "l_wtp",
     "customer": "Riverside Water Authority", "site": "Hamilton, ON",
     "lifecycle": LifecycleStatus.IN_SERVICE},
    {"key": "sms", "name": "Steel Melt Shop", "code": "SMS", "loc": "l_sms",
     "customer": "Eastgate Steel", "site": "Buffalo, NY",
     "lifecycle": LifecycleStatus.COMMISSIONED},
    {"key": "pm3", "name": "Paper Machine Line 3", "code": "PM3", "loc": "l_pm3",
     "customer": "Northmill Paper Co.", "site": "Hamilton, ON",
     "lifecycle": LifecycleStatus.IN_SERVICE},
    {"key": "bgp", "name": "Biogas Plant", "code": "BGP", "loc": "l_bgp",
     "customer": "Green Valley Energy", "site": "Welland, ON",
     "lifecycle": LifecycleStatus.INSTALLED},
    {"key": "pkg", "name": "Packaging Machine", "code": "PKG", "loc": "l_pkg",
     "customer": "Lakeside Foods", "site": "Burlington, ON",
     "lifecycle": LifecycleStatus.ENGINEERING},
]

# System Groups under each Project (project_key, group_key, name, type, lifecycle).
GROUPS = [
    # Water Treatment Plant
    ("wtp", "g_wtp_mcc", "MCC", GroupType.MCC, LifecycleStatus.IN_SERVICE),
    ("wtp", "g_wtp_lvdp", "LVDP", GroupType.LVDP, LifecycleStatus.IN_SERVICE),
    ("wtp", "g_wtp_plc", "PLC", GroupType.PLC, LifecycleStatus.IN_SERVICE),
    # Steel Melt Shop
    ("sms", "g_sms_mcc", "MCC", GroupType.MCC, LifecycleStatus.COMMISSIONED),
    ("sms", "g_sms_mv", "MV", GroupType.MV, LifecycleStatus.COMMISSIONED),
    ("sms", "g_sms_plc", "PLC", GroupType.PLC, LifecycleStatus.COMMISSIONED),
    # Paper Machine Line 3
    ("pm3", "g_pm3_mcc", "MCC", GroupType.MCC, LifecycleStatus.IN_SERVICE),
    ("pm3", "g_pm3_lvdp", "LVDP", GroupType.LVDP, LifecycleStatus.IN_SERVICE),
    ("pm3", "g_pm3_scada", "SCADA", GroupType.SCADA, LifecycleStatus.IN_SERVICE),
    # Biogas Plant
    ("bgp", "g_bgp_mcc", "MCC", GroupType.MCC, LifecycleStatus.INSTALLED),
    ("bgp", "g_bgp_plc", "PLC", GroupType.PLC, LifecycleStatus.INSTALLED),
    # Packaging Machine
    ("pkg", "g_pkg_custom", "Machine Control", GroupType.CUSTOM, LifecycleStatus.ENGINEERING),
]

# Panels (group_key, tag, serial, name, area, voltage, current, phase, mfr, enclosure, cabinets).
# Cabinet list is a list of (name, code) tuples in display order.
PANELS = [
    # WTP — MCC
    ("g_wtp_mcc", "WTP-MCC-MDB", "WTP-MCC-MDB-0001", "Main Distribution Board",
     "MV Room", "400V", "2500A", "3Ø 4W", "Schneider Electric", "IP54",
     [("Incoming", "C1"), ("Generator Coupling", "C2"), ("Distribution", "C3")]),
    ("g_wtp_mcc", "WTP-MCC-BMCC", "WTP-MCC-BMCC-0002", "Blower MCC",
     "Blower Hall", "400V", "800A", "3Ø 3W", "Siemens", "IP42",
     [("Blower-1 Feeder", "C1"), ("Blower-2 Feeder", "C2"), ("VFD Section", "C3")]),
    ("g_wtp_mcc", "WTP-MCC-PMCC", "WTP-MCC-PMCC-0003", "Pump MCC",
     "Pump Room", "400V", "630A", "3Ø 3W", "ABB", "IP54",
     [("Pump-1 Feeder", "C1"), ("Pump-2 Feeder", "C2"), ("Softstarter", "C3")]),
    ("g_wtp_lvdp", "WTP-LVDP-AUX", "WTP-LVDP-AUX-0001", "Auxiliary Distribution",
     "Plant Wide", "230V", "63A", "1Ø", "Schneider Electric", "IP54",
     [("Incoming", "C1"), ("Lighting", "C2"), ("HVAC", "C3")]),
    ("g_wtp_plc", "WTP-PLC-01", "WTP-PLC-01-0001", "PLC Panel",
     "Control Room", "230V", "63A", "1Ø", "Siemens", "IP55",
     [("CPU", "C1"), ("Remote I/O", "C2"), ("Network", "C3")]),
    # SMS — MCC + MV + PLC
    ("g_sms_mcc", "SMS-MCC-MAIN", "SMS-MCC-MAIN-0001", "Main MCC",
     "Melt Bay", "690V", "4000A", "3Ø 3W", "ABB", "IP42",
     [("Incoming", "C1"), ("Furnace Feeders", "C2"), ("Distribution", "C3")]),
    ("g_sms_mcc", "SMS-MCC-FDP", "SMS-MCC-FDP-0002", "Furnace Drive Panel",
     "Furnace Hall", "690V", "2500A", "3Ø 3W", "Siemens", "IP42",
     [("Converter", "C1"), ("Drive", "C2"), ("Cooling", "C3")]),
    ("g_sms_mv", "SMS-MV-INC", "SMS-MV-INC-0001", "MV Incoming Switchgear",
     "MV Room", "11kV", "1250A", "3Ø 3W", "ABB", "Metal-clad",
     [("Incoming", "C1"), ("Feeder 1", "C2"), ("Feeder 2", "C3")]),
    ("g_sms_plc", "SMS-PLC-AUTO", "SMS-PLC-AUTO-0001", "Automation PLC Panel",
     "Control Room", "230V", "63A", "1Ø", "Siemens", "IP55",
     [("CPU", "C1"), ("Remote I/O", "C2"), ("Comms", "C3")]),
    # PM3 — MCC + LVDP + SCADA
    ("g_pm3_mcc", "PM3-MCC-DRY", "PM3-MCC-DRY-0001", "Dryer Section MCC",
     "Dryer Section", "400V", "1200A", "3Ø 3W", "ABB", "IP42",
     [("Dryer Motors", "C1"), ("Fan Feeders", "C2"), ("VFD", "C3")]),
    ("g_pm3_mcc", "PM3-MCC-PRS", "PM3-MCC-PRS-0002", "Press Section MCC",
     "Press Section", "400V", "1000A", "3Ø 3W", "Siemens", "IP42",
     [("Press Drives", "C1"), ("Hydraulic", "C2"), ("Utility", "C3")]),
    ("g_pm3_lvdp", "PM3-LVDP-MDB", "PM3-LVDP-MDB-0001", "Main Distribution Board",
     "Electrical Room", "400V", "2000A", "3Ø 4W", "Eaton", "IP54",
     [("Incoming", "C1"), ("Distribution", "C2")]),
    ("g_pm3_scada", "PM3-SCADA-01", "PM3-SCADA-01-0001", "SCADA Panel",
     "Control Room", "230V", "63A", "1Ø", "Siemens", "IP55",
     [("Servers", "C1"), ("Network", "C2"), ("UPS", "C3")]),
    # BGP — MCC + PLC
    ("g_bgp_mcc", "BGP-MCC-MAIN", "BGP-MCC-MAIN-0001", "Main MCC",
     "Switchroom", "400V", "1600A", "3Ø 4W", "Schneider Electric", "IP54",
     [("Incoming", "C1"), ("Generator Coupling", "C2"), ("Distribution", "C3")]),
    ("g_bgp_mcc", "BGP-MCC-CHP", "BGP-MCC-CHP-0002", "CHP Panel",
     "CHP Container", "400V", "1000A", "3Ø 3W", "Siemens", "IP54",
     [("Sync", "C1"), ("Gen Protection", "C2"), ("Metering", "C3")]),
    ("g_bgp_plc", "BGP-PLC-01", "BGP-PLC-01-0001", "PLC Panel",
     "Control Room", "230V", "63A", "1Ø", "Siemens", "IP55",
     [("CPU", "C1"), ("I/O", "C2"), ("Comms", "C3")]),
    # PKG — Machine Control (CUSTOM)
    ("g_pkg_custom", "PKG-MCP-01", "PKG-MCP-01-0001", "Main Control Panel",
     "Machine Frame", "400V", "125A", "3Ø 4W", "Rittal", "IP55",
     [("Power", "C1"), ("PLC", "C2"), ("Terminal", "C3")]),
    ("g_pkg_custom", "PKG-OPS-01", "PKG-OPS-01-0001", "Operator Station",
     "Operator Side", "230V", "16A", "1Ø", "Rittal", "IP65",
     [("HMI", "C1"), ("Network", "C2")]),
]

# Detail-rich panel: WTP-MCC-BMCC carries the full revision/component/sheet history.
DETAIL_TAG = "WTP-MCC-BMCC"

COMPONENTS_DETAIL = [
    {"slot":"1A","ref":"CB-101","desc":"Main Circuit Breaker","part":"Siemens 3VA2225-5HL32","rating":"250A","type":"MCCB","status":"ok"},
    {"slot":"1B","ref":"CB-102","desc":"Feeder Breaker — Conveyor 1","part":"Siemens 3VA1140-4ED32","rating":"40A","type":"MCCB","status":"ok"},
    {"slot":"2A","ref":"C-201","desc":"Contactor — Pump M1","part":"Siemens 3RT2026-1BB40","rating":"25A","type":"Contactor","status":"warn"},
    {"slot":"2B","ref":"OL-201","desc":"Overload Relay — Pump M1","part":"Siemens 3RU2126-4AB0","rating":"11-16A","type":"Overload","status":"warn"},
    {"slot":"3A","ref":"C-202","desc":"Contactor — Fan F2","part":"ABB AF16-30-10","rating":"18A","type":"Contactor","status":"ok"},
    {"slot":"3B","ref":"VFD-301","desc":"Drive — Blower B1","part":"ABB ACS580-01-12A2-4","rating":"5.5kW","type":"VFD","status":"ok"},
    {"slot":"4A","ref":"PLC-401","desc":"PLC CPU","part":"Siemens 6ES7 215-1AG40-0XB0","rating":"24VDC","type":"PLC","status":"ok"},
    {"slot":"4B","ref":"PS-402","desc":"Power Supply 24VDC","part":"Phoenix QUINT4-PS/1AC/24DC/10","rating":"10A","type":"PSU","status":"ok"},
    {"slot":"5A","ref":"TX-501","desc":"Control Transformer","part":"Hammond C1F500ES","rating":"500VA","type":"XFMR","status":"ok"},
    {"slot":"5B","ref":"F-502","desc":"Control Fuses","part":"Bussmann FNQ-R-5","rating":"5A","type":"Fuse","status":"ok"},
]

REVISIONS_DETAIL = [
    {"rev":"A","number":1,"date":"2024-11-02","by":"Dan Okafor","status":"superseded","note":"Initial issue for construction. Released to panel shop.","approver":"Mara Voss"},
    {"rev":"B","number":2,"date":"2025-04-11","by":"Erik Lund","status":"superseded","note":"As-built markups from commissioning.","approver":"Mara Voss"},
    {"rev":"C","number":3,"date":"2025-09-30","by":"Priya Raman","status":"superseded","note":"Updated PLC firmware references and I/O list.","approver":"Dan Okafor"},
    {"rev":"D","number":4,"date":"2026-02-15","by":"Dan Okafor","status":"superseded","note":"Added VFD-301 for blower B1; removed legacy soft-starter.","approver":"Mara Voss"},
    {"rev":"E","number":5,"date":"2026-05-28","by":"Priya Raman","status":"approved","note":"Replaced OL-201 overload relay range after nuisance trips.","approver":"Mara Voss"},
]

REV_QUEUE = [
    {"panel_tag":"WTP-MCC-BMCC","rev":"F","from":"E","by":"Priya Raman","status":"draft","note":"Add spare feeder breaker CB-110 for a future blower."},
    {"panel_tag":"SMS-MCC-FDP","rev":"B","from":"A","by":"Dan Okafor","status":"review","note":"Converter firmware update per drive coordination study CS-2026-04."},
    {"panel_tag":"PM3-MCC-DRY","rev":"B","from":"A","by":"Erik Lund","status":"review","note":"Correct CT ratio on dryer metering."},
    {"panel_tag":"BGP-MCC-CHP","rev":"B","from":"A","by":"Erik Lund","status":"draft","note":"Document generator protection relay setting change."},
]

SHEETS = [
    ("001", "Cover / Index"),
    ("002", "Symbol Legend"),
    ("003", "Single-Line Diagram"),
    ("004", "Power — Incomer & Main"),
    ("005", "Power — Motor Feeders"),
    ("006", "Power — VFD Section"),
    ("007", "Control — PLC I/O"),
    ("008", "Control — Terminal Plan"),
    ("009", "Panel Layout / GA"),
    ("010", "Bill of Materials"),
]


def _el(eid: str, etype: str, x: float, y: float, w: float, h: float, z: int, **kw: Any) -> dict[str, Any]:
    base = {"id": eid, "type": etype, "x": x, "y": y, "w": w, "h": h,
            "rotation": 0, "z": z, "visible": True}
    base.update(kw)
    return base


def _doc(orient: str, w: float, h: float, kind: str, fill: str, radius: float,
         elements: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "version": 2, "orientation": orient, "size_mm": {"w": w, "h": h},
        "background": {"kind": kind, "fill": fill, "radius_mm": radius},
        "grid_mm": 1, "elements": elements,
    }


def label_templates() -> list[dict[str, Any]]:
    """The 10 default templates."""
    from panelos_api.labels.layout import default_engraved_layout, default_print_layout
    return [
        {"name": "Industrial Engraved", "concept": "engraved", "size_mm": "90x50", "orientation": "landscape", "is_default": True, "layout": default_engraved_layout(90, 50)},
        {"name": "Printable B/W", "concept": "print_bw", "size_mm": "90x50", "orientation": "landscape", "is_default": False, "layout": default_print_layout(90, 50)},
    ]


def _make_placeholder_pdf(title: str) -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(72, 770, "PanelOS — Placeholder Schematic")
    c.setFont("Helvetica", 14)
    c.drawString(72, 740, title)
    c.setFont("Helvetica", 10)
    c.drawString(72, 60, "Generated by scripts/seed.py")
    c.showPage()
    c.save()
    return buf.getvalue()


def _role(label: str) -> Role:
    return {
        "Owner": Role.OWNER,
        "Admin": Role.ADMIN,
        "Engineer": Role.ENGINEER,
        "Technician": Role.TECHNICIAN,
        "Viewer": Role.VIEWER,
    }[label]


async def reset(session: Any) -> None:
    await session.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    await session.commit()


async def seed() -> None:
    Sess = get_sessionmaker()
    async with Sess() as session:
        company = Company(
            name="NorthForge Automation",
            slug="northforge",
            short_name="NORTHFORGE",
            standards_profile="IEC 61439",
        )
        session.add(company)
        await session.flush()
        await session.execute(
            text("SELECT set_config('app.company_id', :cid, true)"),
            {"cid": str(company.id)},
        )

        # Users
        users_by_key: dict[str, User] = {}
        for u in USERS:
            user = User(
                email=u["email"].lower(),
                name=u["name"],
                password_hash=hash_password(PASSWORD) if u["status"] == "active" else None,
                is_active=u["status"] == "active",
            )
            session.add(user)
            await session.flush()
            users_by_key[u["key"]] = user
            session.add(
                Membership(
                    company_id=company.id,
                    user_id=user.id,
                    role=_role(u["role"]),
                    status=u["status"],
                    accepted_at=datetime.now(UTC) if u["status"] == "active" else None,
                    invited_at=datetime.now(UTC) - timedelta(days=2) if u["status"] == "invited" else None,
                    last_active_at=datetime.now(UTC) - timedelta(hours=3) if u["status"] == "active" else None,
                )
            )
        await session.flush()

        # Locations
        locs_by_key: dict[str, Location] = {}
        for loc in LOCATIONS:
            row = Location(company_id=company.id, code=loc["code"], name=loc["name"], region=loc["region"])
            session.add(row)
            locs_by_key[loc["key"]] = row
        await session.flush()

        # Label templates (idempotent)
        existing_tpls = (
            await session.execute(
                text("SELECT COUNT(*) FROM label_templates WHERE company_id = :cid"),
                {"cid": str(company.id)},
            )
        ).scalar_one()
        if existing_tpls == 0:
            for t in label_templates():
                session.add(
                    LabelTemplate(
                        company_id=company.id, name=t["name"], concept=t["concept"],
                        size_mm=t["size_mm"], orientation=t["orientation"],
                        layout_json=t["layout"], is_default=t["is_default"],
                    )
                )
            await session.flush()

        # Projects
        projects_by_key: dict[str, Project] = {}
        for p in PROJECTS:
            proj = Project(
                company_id=company.id,
                name=p["name"],
                code=p["code"],
                customer=p["customer"],
                site=p["site"],
                location_id=locs_by_key[p["loc"]].id,
                lifecycle_status=p["lifecycle"],
            )
            session.add(proj)
            projects_by_key[p["key"]] = proj
        await session.flush()

        # System Groups
        groups_by_key: dict[str, SystemGroup] = {}
        for project_key, group_key, name, group_type, lifecycle in GROUPS:
            grp = SystemGroup(
                company_id=company.id,
                project_id=projects_by_key[project_key].id,
                name=name,
                code=name,
                group_type=group_type,
                lifecycle_status=lifecycle,
            )
            session.add(grp)
            groups_by_key[group_key] = grp
        await session.flush()

        # Panels + cabinets
        panels_by_tag: dict[str, Panel] = {}
        cabinet_count = 0
        for group_key, tag, serial, name, area, volt, amp, phase, mfr, enclosure, cabinets in PANELS:
            grp = groups_by_key[group_key]
            panel = Panel(
                company_id=company.id,
                system_group_id=grp.id,
                location_id=projects_by_key[
                    next(p["key"] for p in PROJECTS if any(g[0] == p["key"] and g[1] == group_key for g in GROUPS))
                ].location_id,
                tag=tag,
                serial=serial,
                qr_token=new_qr_token(),
                name=name,
                area=area,
                voltage=volt,
                current_a=amp,
                phase=phase,
                mfr=mfr,
                enclosure=enclosure,
            )
            session.add(panel)
            await session.flush()
            panels_by_tag[tag] = panel
            for idx, (cname, ccode) in enumerate(cabinets):
                session.add(
                    Cabinet(
                        company_id=company.id, panel_id=panel.id,
                        name=cname, code=ccode, position=idx,
                    )
                )
                cabinet_count += 1
        await session.flush()

        # Revisions for the detail-rich panel
        detail = panels_by_tag[DETAIL_TAG]
        approver_user = users_by_key["u1"]
        rev_objs: dict[str, PanelRevision] = {}
        for r in REVISIONS_DETAIL:
            by_user = next(u for u in users_by_key.values() if u.name == r["by"])
            stat = RevisionStatus(r["status"])
            rev = PanelRevision(
                panel_id=detail.id,
                revision_letter=r["rev"],
                revision_number=int(r["number"]),
                status=stat,
                change_summary=r["note"],
                created_by=by_user.id,
                approved_by=approver_user.id,
                approved_at=datetime.fromisoformat(r["date"] + "T00:00:00+00:00"),
                superseded_at=(
                    datetime.fromisoformat(r["date"] + "T00:00:00+00:00")
                    if stat == RevisionStatus.SUPERSEDED else None
                ),
            )
            session.add(rev)
            rev_objs[r["rev"]] = rev
        await session.flush()
        detail.active_revision_id = rev_objs["E"].id

        # Components for rev E
        rev_e = rev_objs["E"]
        for c in COMPONENTS_DETAIL:
            session.add(
                Component(
                    revision_id=rev_e.id, slot=c["slot"], ref=c["ref"],
                    description=c["desc"], part_number=c["part"], rating=c["rating"],
                    type=c["type"], status=c["status"],
                )
            )

        # Sheets attached to rev E
        for sheet_n, sheet_title in SHEETS:
            pdf_bytes = _make_placeholder_pdf(sheet_title)
            pf = PdfFile(
                company_id=company.id, storage_provider="local",
                storage_key=f"seed/{DETAIL_TAG}/{sheet_n}.pdf",
                sha256="0" * 64, byte_size=len(pdf_bytes), mime="application/pdf",
                original_filename=f"{DETAIL_TAG}_sheet_{sheet_n}.pdf",
            )
            session.add(pf)
            await session.flush()
            session.add(
                RevisionFile(
                    revision_id=rev_e.id, file_id=pf.id,
                    sheet_number=sheet_n, sheet_title=sheet_title, page_index=0,
                )
            )

        # Queued revision requests
        for q in REV_QUEUE:
            panel = panels_by_tag[q["panel_tag"]]
            by_user = next(u for u in users_by_key.values() if u.name == q["by"])
            number = (
                (await session.execute(
                    text(
                        "SELECT COALESCE(MAX(revision_number),0) "
                        "FROM panel_revisions WHERE panel_id = :pid"
                    ),
                    {"pid": str(panel.id)},
                )).scalar_one()
            ) + 1
            session.add(
                PanelRevision(
                    panel_id=panel.id, revision_letter=q["rev"], revision_number=int(number),
                    status=RevisionStatus(q["status"]), change_summary=q["note"],
                    created_by=by_user.id,
                    submitted_at=datetime.now(UTC) if q["status"] == "review" else None,
                )
            )

        await session.commit()
        print(
            f"seeded company={company.slug} users={len(USERS)} "
            f"locations={len(LOCATIONS)} projects={len(PROJECTS)} "
            f"groups={len(GROUPS)} panels={len(PANELS)} cabinets={cabinet_count} "
            f"revisions(detail)={len(REVISIONS_DETAIL)} queue={len(REV_QUEUE)}"
        )
    await dispose_engine()


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="drop public schema first (DESTRUCTIVE)")
    args = parser.parse_args()

    if args.reset:
        Sess = get_sessionmaker()
        async with Sess() as s:
            await reset(s)
        import subprocess
        subprocess.run(["alembic", "upgrade", "head"], check=True)  # noqa: S603, S607

    await seed()


if __name__ == "__main__":
    asyncio.run(main())
