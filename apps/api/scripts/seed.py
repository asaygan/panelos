"""Seed PanelOS with a realistic industrial asset structure.

  - 1 company (NorthForge Automation)
  - 7 users (Mara, Dan, Priya, Erik, Sofia, James, Lena -- Lena is invited)
  - 5 locations (one per facility)
  - 5 Panel Sets (facilities): Water Treatment Plant, Steel Melt Shop,
    Paper Machine Line 3, Biogas Plant, Packaging Machine
  - 18 panels grouped under those sets, each with ordered typed Sections
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
from panelos_api.db.models.company import Company
from panelos_api.db.models.component import Component
from panelos_api.db.models.label_template import LabelTemplate
from panelos_api.db.models.location import Location
from panelos_api.db.models.membership import Membership
from panelos_api.db.models.panel import Panel, PanelStatus
from panelos_api.db.models.panel_revision import PanelRevision, RevisionStatus
from panelos_api.db.models.panel_set import PanelSet
from panelos_api.db.models.pdf_file import PdfFile
from panelos_api.db.models.revision_file import RevisionFile
from panelos_api.db.models.section import Section, SectionType
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

# Panel Sets = facilities / process systems (top of the asset tree).
PANEL_SETS = [
    {"key": "wtp", "name": "Water Treatment Plant Electrical System", "code": "WTP", "loc": "l_wtp"},
    {"key": "sms", "name": "Steel Melt Shop Electrical System", "code": "SMS", "loc": "l_sms"},
    {"key": "pm3", "name": "Paper Machine Line 3", "code": "PM3", "loc": "l_pm3"},
    {"key": "bgp", "name": "Biogas Plant Electrical System", "code": "BGP", "loc": "l_bgp"},
    {"key": "pkg", "name": "Packaging Machine Electrical System", "code": "PKG", "loc": "l_pkg"},
]

# Panels grouped under a Panel Set; each carries ordered, typed Sections.
# ``sections`` is a list of (section_type, name) tuples in display order.
PANELS = [
    # ── Water Treatment Plant ─────────────────────────────────────────────
    {"set":"wtp","tag":"WTP-MDB","serial":"WTP-MDB-0001","name":"Main Distribution Board","loc":"l_wtp","area":"MV Room","volt":"400V","amp":"2500A","phase":"3Ø 4W","mfr":"Schneider Electric","enclosure":"IP54","status":"in_service","sections":[("incoming","Incoming Section"),("generator","Generator Coupling"),("distribution","Distribution Section")]},
    {"set":"wtp","tag":"WTP-BMCC","serial":"WTP-BMCC-0002","name":"Blower MCC","loc":"l_wtp","area":"Blower Hall","volt":"400V","amp":"800A","phase":"3Ø 3W","mfr":"Siemens","enclosure":"IP42","status":"installed","sections":[("feeder","Blower-1 Feeder"),("feeder","Blower-2 Feeder"),("vfd","VFD Section")]},
    {"set":"wtp","tag":"WTP-PMCC","serial":"WTP-PMCC-0003","name":"Pump MCC","loc":"l_wtp","area":"Pump Room","volt":"400V","amp":"630A","phase":"3Ø 3W","mfr":"ABB","enclosure":"IP54","status":"engineering","sections":[("feeder","Pump-1 Feeder"),("feeder","Pump-2 Feeder"),("softstarter","Softstarter Section")]},
    {"set":"wtp","tag":"WTP-PLC","serial":"WTP-PLC-0004","name":"PLC Panel","loc":"l_wtp","area":"Control Room","volt":"230V","amp":"63A","phase":"1Ø","mfr":"Siemens","enclosure":"IP55","status":"in_service","sections":[("plc_cpu","CPU Section"),("plc_io","IO Section"),("network","Network Section")]},
    # ── Steel Melt Shop ───────────────────────────────────────────────────
    {"set":"sms","tag":"SMS-MCC","serial":"SMS-MCC-0001","name":"Main MCC","loc":"l_sms","area":"Melt Bay","volt":"690V","amp":"4000A","phase":"3Ø 3W","mfr":"ABB","enclosure":"IP42","status":"in_service","sections":[("incoming","Incoming Section"),("feeder","Furnace Feeders"),("distribution","Distribution Section")]},
    {"set":"sms","tag":"SMS-FDP","serial":"SMS-FDP-0002","name":"Furnace Drive Panel","loc":"l_sms","area":"Furnace Hall","volt":"690V","amp":"2500A","phase":"3Ø 3W","mfr":"Siemens","enclosure":"IP42","status":"installed","sections":[("vfd","Converter Section"),("vfd","Drive Section"),("custom","Cooling Section")]},
    {"set":"sms","tag":"SMS-RMCC","serial":"SMS-RMCC-0003","name":"Rolling Mill MCC","loc":"l_sms","area":"Rolling Mill","volt":"400V","amp":"1600A","phase":"3Ø 3W","mfr":"Schneider Electric","enclosure":"IP54","status":"in_service","sections":[("feeder","Mill Stand Feeders"),("feeder","Hydraulic Feeders"),("feeder","Auxiliary Feeders")]},
    {"set":"sms","tag":"SMS-APLC","serial":"SMS-APLC-0004","name":"Automation PLC Panel","loc":"l_sms","area":"Control Room","volt":"230V","amp":"63A","phase":"1Ø","mfr":"Siemens","enclosure":"IP55","status":"in_service","sections":[("plc_cpu","CPU Section"),("plc_io","Remote IO Section"),("network","Communication Section")]},
    # ── Paper Machine Line 3 ──────────────────────────────────────────────
    {"set":"pm3","tag":"PM3-MDB","serial":"PM3-MDB-0001","name":"Main Distribution Board","loc":"l_pm3","area":"Electrical Room","volt":"400V","amp":"2000A","phase":"3Ø 4W","mfr":"Eaton","enclosure":"IP54","status":"in_service","sections":[("incoming","Incoming Section"),("distribution","Distribution Section")]},
    {"set":"pm3","tag":"PM3-DMCC","serial":"PM3-DMCC-0002","name":"Dryer Section MCC","loc":"l_pm3","area":"Dryer Section","volt":"400V","amp":"1200A","phase":"3Ø 3W","mfr":"ABB","enclosure":"IP42","status":"in_service","sections":[("feeder","Dryer Motors"),("feeder","Fan Feeders"),("vfd","VFD Section")]},
    {"set":"pm3","tag":"PM3-PMCC","serial":"PM3-PMCC-0003","name":"Press Section MCC","loc":"l_pm3","area":"Press Section","volt":"400V","amp":"1000A","phase":"3Ø 3W","mfr":"Siemens","enclosure":"IP42","status":"installed","sections":[("vfd","Press Drives"),("feeder","Hydraulic Section"),("feeder","Utility Feeders")]},
    {"set":"pm3","tag":"PM3-PLC","serial":"PM3-PLC-0004","name":"PLC & SCADA Panel","loc":"l_pm3","area":"Control Room","volt":"230V","amp":"63A","phase":"1Ø","mfr":"Siemens","enclosure":"IP55","status":"in_service","sections":[("plc_cpu","CPU Section"),("network","Network Section"),("ups","UPS Section")]},
    # ── Biogas Plant ──────────────────────────────────────────────────────
    {"set":"bgp","tag":"BGP-MCC","serial":"BGP-MCC-0001","name":"Main MCC","loc":"l_bgp","area":"Switchroom","volt":"400V","amp":"1600A","phase":"3Ø 4W","mfr":"Schneider Electric","enclosure":"IP54","status":"in_service","sections":[("incoming","Incoming Section"),("generator","Generator Coupling"),("distribution","Distribution Section")]},
    {"set":"bgp","tag":"BGP-BMCC","serial":"BGP-BMCC-0002","name":"Blower MCC","loc":"l_bgp","area":"Digester Area","volt":"400V","amp":"630A","phase":"3Ø 3W","mfr":"ABB","enclosure":"IP54","status":"in_service","sections":[("feeder","Blower Feeders"),("vfd","VFD Section"),("feeder","Auxiliary Feeders")]},
    {"set":"bgp","tag":"BGP-CHP","serial":"BGP-CHP-0003","name":"CHP Panel","loc":"l_bgp","area":"CHP Container","volt":"400V","amp":"1000A","phase":"3Ø 3W","mfr":"Siemens","enclosure":"IP54","status":"installed","sections":[("custom","Synchronization Section"),("protection","Generator Protection"),("metering","Metering Section")]},
    {"set":"bgp","tag":"BGP-PLC","serial":"BGP-PLC-0004","name":"PLC Panel","loc":"l_bgp","area":"Control Room","volt":"230V","amp":"63A","phase":"1Ø","mfr":"Siemens","enclosure":"IP55","status":"in_service","sections":[("plc_cpu","CPU Section"),("plc_io","IO Section"),("network","Communication Section")]},
    # ── Packaging Machine (OEM) ───────────────────────────────────────────
    {"set":"pkg","tag":"PKG-MCP","serial":"PKG-MCP-0001","name":"Main Control Panel","loc":"l_pkg","area":"Machine Frame","volt":"400V","amp":"125A","phase":"3Ø 4W","mfr":"Rittal","enclosure":"IP55","status":"in_service","sections":[("distribution","Power Section"),("plc_cpu","PLC Section"),("terminal","Terminal Section")]},
    {"set":"pkg","tag":"PKG-OPS","serial":"PKG-OPS-0002","name":"Operator Station","loc":"l_pkg","area":"Operator Side","volt":"230V","amp":"16A","phase":"1Ø","mfr":"Rittal","enclosure":"IP65","status":"in_service","sections":[("hmi","HMI Section"),("network","Network Section")]},
]

# Detail-rich panel: Blower MCC under the Water Treatment Plant carries the full
# revision / component / sheet history (it has a VFD section, fitting this data).
DETAIL_TAG = "WTP-BMCC"

COMPONENTS_P2 = [
    {"slot":"1A","ref":"CB-101","desc":"Main Circuit Breaker","part":"Siemens 3VA2225-5HL32","rating":"250A","type":"MCCB","status":"in_service"},
    {"slot":"1B","ref":"CB-102","desc":"Feeder Breaker — Conveyor 1","part":"Siemens 3VA1140-4ED32","rating":"40A","type":"MCCB","status":"in_service"},
    {"slot":"2A","ref":"C-201","desc":"Contactor — Pump M1","part":"Siemens 3RT2026-1BB40","rating":"25A","type":"Contactor","status":"installed"},
    {"slot":"2B","ref":"OL-201","desc":"Overload Relay — Pump M1","part":"Siemens 3RU2126-4AB0","rating":"11-16A","type":"Overload","status":"installed"},
    {"slot":"3A","ref":"C-202","desc":"Contactor — Fan F2","part":"ABB AF16-30-10","rating":"18A","type":"Contactor","status":"in_service"},
    {"slot":"3B","ref":"VFD-301","desc":"Drive — Blower B1","part":"ABB ACS580-01-12A2-4","rating":"5.5kW","type":"VFD","status":"in_service"},
    {"slot":"4A","ref":"PLC-401","desc":"PLC CPU","part":"Siemens 6ES7 215-1AG40-0XB0","rating":"24VDC","type":"PLC","status":"in_service"},
    {"slot":"4B","ref":"PS-402","desc":"Power Supply 24VDC","part":"Phoenix QUINT4-PS/1AC/24DC/10","rating":"10A","type":"PSU","status":"in_service"},
    {"slot":"5A","ref":"TX-501","desc":"Control Transformer","part":"Hammond C1F500ES","rating":"500VA","type":"XFMR","status":"in_service"},
    {"slot":"5B","ref":"F-502","desc":"Control Fuses","part":"Bussmann FNQ-R-5","rating":"5A","type":"Fuse","status":"in_service"},
]

REVISIONS_P2 = [
    {"rev":"A","number":1,"date":"2024-11-02","by":"Dan Okafor","status":"superseded","note":"Initial issue for construction. Released to panel shop.","approver":"Mara Voss"},
    {"rev":"B","number":2,"date":"2025-04-11","by":"Erik Lund","status":"superseded","note":"As-built markups from commissioning. Verified contactor ratings against motor nameplate data.","approver":"Mara Voss"},
    {"rev":"C","number":3,"date":"2025-09-30","by":"Priya Raman","status":"superseded","note":"Updated PLC firmware references and I/O list. Corrected terminal numbering on sheet 8.","approver":"Dan Okafor"},
    {"rev":"D","number":4,"date":"2026-02-15","by":"Dan Okafor","status":"superseded","note":"Added VFD-301 (ACS580) for blower B1; removed legacy soft-starter.","approver":"Mara Voss"},
    {"rev":"E","number":5,"date":"2026-05-28","by":"Priya Raman","status":"approved","note":"Replaced OL-201 overload relay range after nuisance trips on Pump M1. Updated trip class to 10A.","approver":"Mara Voss"},
]

REV_QUEUE = [
    {"panel_tag":"WTP-BMCC","rev":"F","from":"E","by":"Priya Raman","status":"draft","note":"Add spare feeder breaker CB-110 for a future blower."},
    {"panel_tag":"SMS-FDP","rev":"B","from":"A","by":"Dan Okafor","status":"review","note":"Converter firmware update per drive coordination study CS-2026-04."},
    {"panel_tag":"PM3-DMCC","rev":"B","from":"A","by":"Erik Lund","status":"review","note":"Correct CT ratio on dryer metering — field discrepancy reported."},
    {"panel_tag":"BGP-CHP","rev":"B","from":"A","by":"Erik Lund","status":"draft","note":"Document generator protection relay setting change."},
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
    """The 10 default templates (plan §4). #1/#2 use the contract examples."""
    from panelos_api.labels.layout import default_engraved_layout, default_print_layout

    # #3 Compact Asset — landscape plain 60x40
    t3 = _doc("landscape", 60, 40, "plain", "#ffffff", 1, [
        _el("tag", "field", 4, 5, 34, 9, 2, binding="tag", font="mono", size_pt=16, weight=700, align="left", color="#000000"),
        _el("name", "field", 4, 15, 34, 4, 2, binding="name", font="sans", size_pt=7, weight=400, align="left", color="#333333", uppercase=True),
        _el("sn", "field", 4, 30, 34, 4, 2, binding="serial", font="mono", size_pt=7, weight=400, align="left", color="#000000"),
        _el("qr", "qr", 38, 6, 18, 18, 1, binding="scan_url", fg="#000000", bg="#ffffff", quiet=1),
        _el("div", "line", 4, 27, 34, 0, 1, stroke="#cccccc", stroke_w=0.3),
    ])

    # #4 Large Feeder — landscape engraved 100x60, oversized QR + standards
    t4 = _doc("landscape", 100, 60, "engraved", "#1f242b", 2, [
        _el("border", "box", 2, 2, 96, 56, 0, fill="none", stroke="#ffffff24", stroke_w=0.25, radius=1.2),
        _el("logo", "logo", 5, 5, 8, 8, 1, source="company", fit="contain"),
        _el("brand", "field", 15, 6, 50, 6, 2, binding="company_short", font="sans", size_pt=8, weight=700, align="left", color="#cdd6df", letter_spacing=0.12),
        _el("tag", "field", 5, 22, 55, 14, 3, binding="tag", font="mono", size_pt=28, weight=700, align="left", color="#ffffff"),
        _el("name", "field", 5, 36, 55, 5, 4, binding="name", font="sans", size_pt=9, weight=400, align="left", color="#9aa6b2", uppercase=True),
        _el("volt", "field", 5, 45, 28, 5, 4, binding="voltage", font="mono", size_pt=8, weight=400, align="left", color="#dde4ec"),
        _el("amp", "field", 33, 45, 28, 5, 4, binding="current", font="mono", size_pt=8, weight=400, align="left", color="#dde4ec"),
        _el("std", "field", 5, 51, 55, 4, 4, binding="standards", font="mono", size_pt=6.5, weight=400, align="left", color="#7d8a97"),
        _el("qr", "qr", 66, 14, 30, 30, 5, binding="scan_url", fg="#000000", bg="#ffffff", quiet=1),
        _el("cap", "text", 66, 46, 30, 3, 5, text="SCAN FOR DOCS", font="sans", size_pt=5.5, weight=600, align="center", color="#7d8a97", letter_spacing=0.1),
    ])

    # #5 Switchgear Wide — landscape engraved 100x40, QR left, voltage/phase
    t5 = _doc("landscape", 100, 40, "engraved", "#1f242b", 1.8, [
        _el("border", "box", 2, 2, 96, 36, 0, fill="none", stroke="#ffffff24", stroke_w=0.25, radius=1),
        _el("qr", "qr", 5, 7, 26, 26, 5, binding="scan_url", fg="#000000", bg="#ffffff", quiet=1),
        _el("brand", "field", 36, 5, 60, 4, 2, binding="company_short", font="sans", size_pt=7, weight=700, align="left", color="#cdd6df", letter_spacing=0.12),
        _el("tag", "field", 36, 11, 60, 13, 3, binding="tag", font="mono", size_pt=26, weight=700, align="left", color="#ffffff"),
        _el("volt", "field", 36, 26, 30, 5, 4, binding="voltage", font="mono", size_pt=8, weight=400, align="left", color="#dde4ec"),
        _el("phase", "field", 66, 26, 30, 5, 4, binding="phase", font="mono", size_pt=8, weight=400, align="left", color="#dde4ec"),
        _el("name", "field", 36, 32, 60, 4, 4, binding="name", font="sans", size_pt=7, weight=400, align="left", color="#9aa6b2", uppercase=True),
    ])

    # #6 Maintenance Tag — landscape plain 70x50, location/area + URL
    t6 = _doc("landscape", 70, 50, "plain", "#ffffff", 1, [
        _el("hdr", "box", 0, 0, 70, 7, 0, fill="#000000", stroke="none", stroke_w=0, radius=0),
        _el("hdrtxt", "text", 3, 0.5, 64, 6, 1, text="MAINTENANCE", font="sans", size_pt=6.5, weight=800, align="left", color="#ffffff", letter_spacing=0.12),
        _el("tag", "field", 4, 10, 40, 9, 2, binding="tag", font="mono", size_pt=16, weight=700, align="left", color="#000000"),
        _el("loc", "field", 4, 20, 42, 5, 2, binding="location", font="sans", size_pt=8, weight=600, align="left", color="#000000"),
        _el("area", "field", 4, 26, 42, 4, 2, binding="area", font="sans", size_pt=7, weight=400, align="left", color="#444444", uppercase=True),
        _el("qr", "qr", 46, 9, 20, 20, 2, binding="scan_url", fg="#000000", bg="#ffffff", quiet=1),
        _el("foot", "line", 4, 40, 62, 0, 1, stroke="#000000", stroke_w=0.3),
        _el("url", "field", 4, 41, 62, 4, 2, binding="scan_url", font="mono", size_pt=6, weight=400, align="left", color="#000000"),
    ])

    # #7 Portrait Panel — portrait engraved 50x90, stacked
    t7 = _doc("portrait", 50, 90, "engraved", "#1f242b", 1.8, [
        _el("border", "box", 2, 2, 46, 86, 0, fill="none", stroke="#ffffff24", stroke_w=0.25, radius=1),
        _el("logo", "logo", 5, 5, 7, 7, 1, source="company", fit="contain"),
        _el("brand", "field", 14, 5.5, 32, 5, 2, binding="company_short", font="sans", size_pt=6.5, weight=700, align="left", color="#cdd6df", letter_spacing=0.1),
        _el("tag", "field", 5, 16, 40, 12, 3, binding="tag", font="mono", size_pt=22, weight=700, align="center", color="#ffffff"),
        _el("name", "field", 5, 28, 40, 5, 4, binding="name", font="sans", size_pt=7, weight=400, align="center", color="#9aa6b2", uppercase=True),
        _el("qr", "qr", 11, 38, 28, 28, 5, binding="scan_url", fg="#000000", bg="#ffffff", quiet=1),
        _el("sn", "field", 5, 70, 40, 4, 4, binding="serial", font="mono", size_pt=7, weight=400, align="center", color="#dde4ec"),
        _el("rev", "field", 5, 76, 40, 4, 4, binding="rev", font="mono", size_pt=7, weight=400, align="center", color="#dde4ec"),
        _el("std", "field", 5, 82, 40, 3, 4, binding="standards", font="mono", size_pt=5.5, weight=400, align="center", color="#7d8a97"),
    ])

    # #8 Portrait Asset — portrait plain 40x60
    t8 = _doc("portrait", 40, 60, "plain", "#ffffff", 1, [
        _el("tag", "field", 3, 4, 34, 9, 2, binding="tag", font="mono", size_pt=15, weight=700, align="center", color="#000000"),
        _el("name", "field", 3, 13, 34, 4, 2, binding="name", font="sans", size_pt=6.5, weight=400, align="center", color="#333333", uppercase=True),
        _el("qr", "qr", 7, 20, 26, 26, 2, binding="scan_url", fg="#000000", bg="#ffffff", quiet=1),
        _el("div", "line", 3, 49, 34, 0, 1, stroke="#cccccc", stroke_w=0.3),
        _el("sn", "field", 3, 50, 34, 5, 2, binding="serial", font="mono", size_pt=7, weight=600, align="center", color="#000000"),
    ])

    # #9 Square QR — portrait plain 40x40, QR-centric
    t9 = _doc("portrait", 40, 40, "plain", "#ffffff", 1, [
        _el("qr", "qr", 4, 3, 32, 28, 2, binding="scan_url", fg="#000000", bg="#ffffff", quiet=1),
        _el("tag", "field", 3, 32, 34, 6, 2, binding="tag", font="mono", size_pt=9, weight=700, align="center", color="#000000"),
    ])

    # #10 Cable Marker — landscape plain 60x15, tiny
    t10 = _doc("landscape", 60, 15, "plain", "#ffffff", 1, [
        _el("tag", "field", 3, 3, 40, 9, 2, binding="tag", font="mono", size_pt=11, weight=700, align="left", color="#000000"),
        _el("qr", "qr", 46, 1.5, 12, 12, 2, binding="scan_url", fg="#000000", bg="#ffffff", quiet=0.5),
    ])

    return [
        {"name": "Industrial Engraved", "concept": "engraved", "size_mm": "90x50", "orientation": "landscape", "is_default": True, "layout": default_engraved_layout(90, 50)},
        {"name": "Printable B/W", "concept": "print_bw", "size_mm": "90x50", "orientation": "landscape", "is_default": False, "layout": default_print_layout(90, 50)},
        {"name": "Compact Asset", "concept": "print_bw", "size_mm": "60x40", "orientation": "landscape", "is_default": False, "layout": t3},
        {"name": "Large Feeder", "concept": "engraved", "size_mm": "100x60", "orientation": "landscape", "is_default": False, "layout": t4},
        {"name": "Switchgear Wide", "concept": "engraved", "size_mm": "100x40", "orientation": "landscape", "is_default": False, "layout": t5},
        {"name": "Maintenance Tag", "concept": "print_bw", "size_mm": "70x50", "orientation": "landscape", "is_default": False, "layout": t6},
        {"name": "Portrait Panel", "concept": "engraved", "size_mm": "50x90", "orientation": "portrait", "is_default": False, "layout": t7},
        {"name": "Portrait Asset", "concept": "print_bw", "size_mm": "40x60", "orientation": "portrait", "is_default": False, "layout": t8},
        {"name": "Square QR", "concept": "print_bw", "size_mm": "40x40", "orientation": "portrait", "is_default": False, "layout": t9},
        {"name": "Cable Marker", "concept": "print_bw", "size_mm": "60x15", "orientation": "landscape", "is_default": False, "layout": t10},
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


def _status(s: str) -> PanelStatus:
    return PanelStatus(s)


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
        # disable RLS scoping for the seed transaction
        await session.execute(
            text("SELECT set_config('app.company_id', :cid, true)"),
            {"cid": str(company.id)},
        )

        # users
        users_by_key: dict[str, User] = {}
        memberships_by_key: dict[str, Membership] = {}
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
            mem = Membership(
                company_id=company.id,
                user_id=user.id,
                role=_role(u["role"]),
                status=u["status"],
                accepted_at=datetime.now(UTC) if u["status"] == "active" else None,
                invited_at=datetime.now(UTC) - timedelta(days=2) if u["status"] == "invited" else None,
                last_active_at=datetime.now(UTC) - timedelta(hours=3) if u["status"] == "active" else None,
            )
            session.add(mem)
            memberships_by_key[u["key"]] = mem
        await session.flush()

        # locations
        locs_by_name: dict[str, Location] = {}
        for loc in LOCATIONS:
            row = Location(
                company_id=company.id,
                code=loc["code"],
                name=loc["name"],
                region=loc["region"],
            )
            session.add(row)
            locs_by_name[loc["name"]] = row
        await session.flush()

        # label templates (idempotent — skip if any exist for the company)
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
                        company_id=company.id,
                        name=t["name"],
                        concept=t["concept"],
                        size_mm=t["size_mm"],
                        orientation=t["orientation"],
                        layout_json=t["layout"],
                        is_default=t["is_default"],
                    )
                )
            await session.flush()

        # panel sets (facilities)
        locs_by_key = {loc["key"]: locs_by_name[loc["name"]] for loc in LOCATIONS}
        sets_by_key: dict[str, PanelSet] = {}
        for ps in PANEL_SETS:
            row = PanelSet(
                company_id=company.id,
                name=ps["name"],
                code=ps["code"],
                location_id=locs_by_key[ps["loc"]].id,
            )
            session.add(row)
            sets_by_key[ps["key"]] = row
        await session.flush()

        # panels (+ their ordered, typed sections)
        panels_by_tag: dict[str, Panel] = {}
        for p in PANELS:
            panel = Panel(
                company_id=company.id,
                panel_set_id=sets_by_key[p["set"]].id,
                location_id=locs_by_key[p["loc"]].id,
                tag=p["tag"],
                serial=p["serial"],
                qr_token=new_qr_token(),
                name=p["name"],
                area=p["area"],
                voltage=p["volt"],
                current_a=p["amp"],
                phase=p["phase"],
                mfr=p["mfr"],
                enclosure=p["enclosure"],
                status=_status(p["status"]),
            )
            session.add(panel)
            panels_by_tag[p["tag"]] = panel
        await session.flush()

        # sections per panel
        section_count = 0
        for p in PANELS:
            panel = panels_by_tag[p["tag"]]
            for idx, (stype, sname) in enumerate(p["sections"]):
                session.add(
                    Section(
                        company_id=company.id,
                        panel_id=panel.id,
                        section_type=SectionType(stype),
                        name=sname,
                        position=idx,
                    )
                )
                section_count += 1
        await session.flush()

        # revisions for the detail-rich panel (Blower MCC under Water Treatment)
        p2 = panels_by_tag[DETAIL_TAG]
        approver_user = users_by_key["u1"]  # Mara
        rev_objs: dict[str, PanelRevision] = {}
        for r in REVISIONS_P2:
            by_user = next(u for u in users_by_key.values() if u.name == r["by"])
            status = RevisionStatus(r["status"])
            rev = PanelRevision(
                panel_id=p2.id,
                revision_letter=r["rev"],
                revision_number=int(r["number"]),
                status=status,
                change_summary=r["note"],
                created_by=by_user.id,
                approved_by=approver_user.id,
                approved_at=datetime.fromisoformat(r["date"] + "T00:00:00+00:00"),
                superseded_at=(
                    datetime.fromisoformat(r["date"] + "T00:00:00+00:00")
                    if status == RevisionStatus.SUPERSEDED
                    else None
                ),
            )
            session.add(rev)
            rev_objs[r["rev"]] = rev
        await session.flush()
        # Active = rev E
        p2.active_revision_id = rev_objs["E"].id

        # components for rev E
        rev_e = rev_objs["E"]
        for c in COMPONENTS_P2:
            session.add(
                Component(
                    revision_id=rev_e.id,
                    slot=c["slot"],
                    ref=c["ref"],
                    description=c["desc"],
                    part_number=c["part"],
                    rating=c["rating"],
                    type=c["type"],
                    status=c["status"],
                )
            )

        # sheets attached to rev E via placeholder PDF files
        for sheet_n, sheet_title in SHEETS:
            pdf_bytes = _make_placeholder_pdf(sheet_title)
            pf = PdfFile(
                company_id=company.id,
                storage_provider="local",
                storage_key=f"seed/mcc3/{sheet_n}.pdf",
                sha256="0" * 64,
                byte_size=len(pdf_bytes),
                mime="application/pdf",
                original_filename=f"MCC-3_sheet_{sheet_n}.pdf",
            )
            session.add(pf)
            await session.flush()
            session.add(
                RevisionFile(
                    revision_id=rev_e.id,
                    file_id=pf.id,
                    sheet_number=sheet_n,
                    sheet_title=sheet_title,
                    page_index=0,
                )
            )

        # queued revision requests across other panels
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
                    panel_id=panel.id,
                    revision_letter=q["rev"],
                    revision_number=int(number),
                    status=RevisionStatus(q["status"]),
                    change_summary=q["note"],
                    created_by=by_user.id,
                    submitted_at=datetime.now(UTC) if q["status"] == "review" else None,
                )
            )

        await session.commit()
        print(
            f"seeded company={company.slug} users={len(USERS)} "
            f"locations={len(LOCATIONS)} panel_sets={len(PANEL_SETS)} "
            f"panels={len(PANELS)} sections={section_count} "
            f"revisions(detail)={len(REVISIONS_P2)} queue={len(REV_QUEUE)}"
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
        # Re-apply alembic migrations after reset.
        import subprocess

        subprocess.run(["alembic", "upgrade", "head"], check=True)  # noqa: S607

    await seed()


if __name__ == "__main__":
    asyncio.run(main())
