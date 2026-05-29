// Fixture data ported from /tmp/panelhub_design/panelos/project/ph-data.js
// Used as fallback when the API isn't reachable (loading states, Storybook).

import type {
  ActivityItem,
  Component,
  Location,
  Panel,
  Revision,
  RevisionRequest,
  Sheet,
  User,
} from "@/lib/api/types";

export const fixtureUsers: User[] = [
  { id: "u1", name: "Mara Voss", initials: "MV", email: "m.voss@northforge.io", color: "#3b82f6", last: "Online now", status: "active" },
  { id: "u2", name: "Dan Okafor", initials: "DO", email: "d.okafor@northforge.io", color: "#1f9d57", last: "4m ago", status: "active" },
  { id: "u3", name: "Priya Raman", initials: "PR", email: "p.raman@northforge.io", color: "#c97a0e", last: "22m ago", status: "active" },
  { id: "u4", name: "Erik Lund", initials: "EL", email: "e.lund@northforge.io", color: "#7c5cff", last: "1h ago", status: "active" },
  { id: "u5", name: "Sofia Marchetti", initials: "SM", email: "s.marchetti@northforge.io", color: "#d8412f", last: "3h ago", status: "active" },
  { id: "u6", name: "James Whitfield", initials: "JW", email: "j.whitfield@acme-mfg.com", color: "#6b7280", last: "2d ago", status: "active" },
  { id: "u7", name: "Lena Hoffmann", initials: "LH", email: "l.hoffmann@northforge.io", color: "#0ea5e9", last: "Pending", status: "invited" },
];

// Role hint per the prototype (kept separate so it doesn't pollute the API type).
export const fixtureUserRoles: Record<string, string> = {
  u1: "Owner",
  u2: "Engineer",
  u3: "Engineer",
  u4: "Technician",
  u5: "Technician",
  u6: "Viewer",
  u7: "Engineer",
};

export const fixtureLocations: Location[] = [
  { id: "l1", company_id: "c1", code: "P1", name: "Plant 1 — Riverside", sub: "Hamilton, ON" },
  { id: "l2", company_id: "c1", code: "P2", name: "Plant 2 — Eastgate", sub: "Buffalo, NY" },
  { id: "l3", company_id: "c1", code: "PH", name: "Pump House", sub: "Hamilton, ON" },
  { id: "l4", company_id: "c1", code: "SB", name: "Substation B", sub: "Hamilton, ON" },
];

export const fixturePanels: Panel[] = [
  { id: "p1", company_id: "c1", location_id: "l1", qr_token: "qrp1", name: "Main Distribution A", serial: "MDP-A-0142", tag: "MDP-A", loc: "Plant 1 — Riverside", area: "MV Room", volt: "600V", amp: "2000A", phase: "3Ø 4W", mfr: "Schneider Electric", enclosure: "NEMA 12", rev: "C", revCount: 7, status: "ok", comps: 42, install: "2019-03-14", updated: "2026-05-26 09:12", by: "Dan Okafor", issues: 0, scanned: "2026-05-29 07:40" },
  { id: "p2", company_id: "c1", location_id: "l1", qr_token: "qrp2", name: "MCC Line 3", serial: "MCC-L3-0088", tag: "MCC-3", loc: "Plant 1 — Riverside", area: "Process Hall", volt: "480V", amp: "800A", phase: "3Ø 3W", mfr: "Siemens", enclosure: "NEMA 12", rev: "E", revCount: 11, status: "warn", comps: 36, install: "2020-08-02", updated: "2026-05-28 16:48", by: "Priya Raman", issues: 2, scanned: "2026-05-29 06:55" },
  { id: "p3", company_id: "c1", location_id: "l3", qr_token: "qrp3", name: "Pump Control Center", serial: "PCC-PH-0031", tag: "PCC-1", loc: "Pump House", area: "Wet Well", volt: "480V", amp: "600A", phase: "3Ø 3W", mfr: "ABB", enclosure: "NEMA 4X", rev: "B", revCount: 4, status: "fault", comps: 28, install: "2021-11-19", updated: "2026-05-29 05:30", by: "Erik Lund", issues: 1, scanned: "2026-05-29 05:31" },
  { id: "p4", company_id: "c1", location_id: "l1", qr_token: "qrp4", name: "Lighting Panel L1", serial: "LP-L1-0210", tag: "LP-1", loc: "Plant 1 — Riverside", area: "Admin Wing", volt: "208V", amp: "225A", phase: "3Ø 4W", mfr: "Eaton", enclosure: "NEMA 1", rev: "A", revCount: 2, status: "ok", comps: 18, install: "2018-06-30", updated: "2026-05-12 11:20", by: "Mara Voss", issues: 0, scanned: "2026-05-24 14:02" },
  { id: "p5", company_id: "c1", location_id: "l2", qr_token: "qrp5", name: "MCC Line 4", serial: "MCC-L4-0091", tag: "MCC-4", loc: "Plant 2 — Eastgate", area: "Bay 2", volt: "480V", amp: "1200A", phase: "3Ø 3W", mfr: "Siemens", enclosure: "NEMA 12", rev: "D", revCount: 9, status: "ok", comps: 51, install: "2020-02-11", updated: "2026-05-27 13:05", by: "Priya Raman", issues: 0, scanned: "2026-05-28 22:10" },
  { id: "p6", company_id: "c1", location_id: "l4", qr_token: "qrp6", name: "Substation Feeder B", serial: "SUB-B-0007", tag: "SUB-B", loc: "Substation B", area: "Switchgear", volt: "4160V", amp: "1200A", phase: "3Ø 3W", mfr: "Schneider Electric", enclosure: "Metal-clad", rev: "F", revCount: 14, status: "warn", comps: 24, install: "2017-09-22", updated: "2026-05-25 08:44", by: "Dan Okafor", issues: 1, scanned: "2026-05-23 10:15" },
  { id: "p7", company_id: "c1", location_id: "l1", qr_token: "qrp7", name: "VFD Cabinet — Blower", serial: "VFD-BL-0119", tag: "VFD-B", loc: "Plant 1 — Riverside", area: "Process Hall", volt: "480V", amp: "400A", phase: "3Ø 3W", mfr: "ABB", enclosure: "NEMA 12", rev: "C", revCount: 6, status: "ok", comps: 14, install: "2022-04-08", updated: "2026-05-20 15:36", by: "Erik Lund", issues: 0, scanned: "2026-05-29 04:20" },
  { id: "p8", company_id: "c1", location_id: "l2", qr_token: "qrp8", name: "Distribution Panel 2A", serial: "PDP-2A-0156", tag: "PDP-2A", loc: "Plant 2 — Eastgate", area: "Bay 1", volt: "600V", amp: "1600A", phase: "3Ø 4W", mfr: "Eaton", enclosure: "NEMA 12", rev: "B", revCount: 5, status: "ok", comps: 33, install: "2019-12-03", updated: "2026-05-18 09:55", by: "Mara Voss", issues: 0, scanned: "2026-05-27 18:30" },
  { id: "p9", company_id: "c1", location_id: "l1", qr_token: "qrp9", name: "MCC Line 1", serial: "MCC-L1-0014", tag: "MCC-1", loc: "Plant 1 — Riverside", area: "Process Hall", volt: "480V", amp: "800A", phase: "3Ø 3W", mfr: "Siemens", enclosure: "NEMA 12", rev: "G", revCount: 16, status: "idle", comps: 39, install: "2016-05-17", updated: "2026-03-30 10:00", by: "Dan Okafor", issues: 0, scanned: "2026-04-02 12:00" },
  { id: "p10", company_id: "c1", location_id: "l3", qr_token: "qrp10", name: "Fire Pump Controller", serial: "FPC-PH-0002", tag: "FPC-1", loc: "Pump House", area: "Pump Room", volt: "480V", amp: "250A", phase: "3Ø 3W", mfr: "ABB", enclosure: "NEMA 2", rev: "A", revCount: 3, status: "ok", comps: 11, install: "2021-07-14", updated: "2026-05-15 14:22", by: "Priya Raman", issues: 0, scanned: "2026-05-26 09:00" },
  { id: "p11", company_id: "c1", location_id: "l1", qr_token: "qrp11", name: "Distribution Panel 1B", serial: "PDP-1B-0144", tag: "PDP-1B", loc: "Plant 1 — Riverside", area: "Admin Wing", volt: "208V", amp: "400A", phase: "3Ø 4W", mfr: "Eaton", enclosure: "NEMA 1", rev: "C", revCount: 6, status: "ok", comps: 26, install: "2018-10-28", updated: "2026-05-22 16:11", by: "Mara Voss", issues: 0, scanned: "2026-05-25 11:45" },
  { id: "p12", company_id: "c1", location_id: "l2", qr_token: "qrp12", name: "MCC Line 5", serial: "MCC-L5-0103", tag: "MCC-5", loc: "Plant 2 — Eastgate", area: "Bay 3", volt: "480V", amp: "1000A", phase: "3Ø 3W", mfr: "Siemens", enclosure: "NEMA 12", rev: "B", revCount: 4, status: "warn", comps: 44, install: "2023-01-30", updated: "2026-05-28 11:30", by: "Erik Lund", issues: 1, scanned: "2026-05-28 19:05" },
];

export const fixtureComponents: Component[] = [
  { slot: "1A", ref: "CB-101", desc: "Main Circuit Breaker", part: "Siemens 3VA2225-5HL32", rating: "250A", type: "MCCB", status: "ok" },
  { slot: "1B", ref: "CB-102", desc: "Feeder Breaker — Conveyor 1", part: "Siemens 3VA1140-4ED32", rating: "40A", type: "MCCB", status: "ok" },
  { slot: "2A", ref: "C-201", desc: "Contactor — Pump M1", part: "Siemens 3RT2026-1BB40", rating: "25A", type: "Contactor", status: "warn" },
  { slot: "2B", ref: "OL-201", desc: "Overload Relay — Pump M1", part: "Siemens 3RU2126-4AB0", rating: "11-16A", type: "Overload", status: "warn" },
  { slot: "3A", ref: "C-202", desc: "Contactor — Fan F2", part: "ABB AF16-30-10", rating: "18A", type: "Contactor", status: "ok" },
  { slot: "3B", ref: "VFD-301", desc: "Drive — Blower B1", part: "ABB ACS580-01-12A2-4", rating: "5.5kW", type: "VFD", status: "ok" },
  { slot: "4A", ref: "PLC-401", desc: "PLC CPU", part: "Siemens 6ES7 215-1AG40-0XB0", rating: "24VDC", type: "PLC", status: "ok" },
  { slot: "4B", ref: "PS-402", desc: "Power Supply 24VDC", part: "Phoenix QUINT4-PS/1AC/24DC/10", rating: "10A", type: "PSU", status: "ok" },
  { slot: "5A", ref: "TX-501", desc: "Control Transformer", part: "Hammond C1F500ES", rating: "500VA", type: "XFMR", status: "ok" },
  { slot: "5B", ref: "F-502", desc: "Control Fuses", part: "Bussmann FNQ-R-5", rating: "5A", type: "Fuse", status: "ok" },
];

export const fixtureRevisions: Revision[] = [
  { id: "rev-e", rev: "E", date: "2026-05-28", by: "Priya Raman", status: "approved", note: "Replaced OL-201 overload relay range after nuisance trips on Pump M1. Updated trip class to 10A.", files: 3, approver: "Mara Voss" },
  { id: "rev-d", rev: "D", date: "2026-02-15", by: "Dan Okafor", status: "superseded", note: "Added VFD-301 (ACS580) for blower B1; removed legacy soft-starter. Revised power schematic sheets 4–6.", files: 6, approver: "Mara Voss" },
  { id: "rev-c", rev: "C", date: "2025-09-30", by: "Priya Raman", status: "superseded", note: "Updated PLC firmware references and I/O list. Corrected terminal numbering on sheet 8.", files: 2, approver: "Dan Okafor" },
  { id: "rev-b", rev: "B", date: "2025-04-11", by: "Erik Lund", status: "superseded", note: "As-built markups from commissioning. Verified contactor ratings against motor nameplate data.", files: 4, approver: "Mara Voss" },
  { id: "rev-a", rev: "A", date: "2024-11-02", by: "Dan Okafor", status: "superseded", note: "Initial issue for construction. Released to panel shop.", files: 8, approver: "Mara Voss" },
];

export const fixtureRevQueue: RevisionRequest[] = [
  { id: "rq1", panel: "MCC Line 3", tag: "MCC-3", rev: "F", from: "E", by: "Priya Raman", date: "2026-05-29", status: "draft", note: "Add spare feeder breaker CB-110 for future conveyor.", sheets: 2 },
  { id: "rq2", panel: "Substation Feeder B", tag: "SUB-B", rev: "G", from: "F", by: "Dan Okafor", date: "2026-05-28", status: "review", note: "Relay setting changes per coordination study CS-2026-04.", sheets: 3 },
  { id: "rq3", panel: "MCC Line 5", tag: "MCC-5", rev: "C", from: "B", by: "Erik Lund", date: "2026-05-28", status: "review", note: "Correct CT ratio on metering — field discrepancy reported.", sheets: 1 },
  { id: "rq4", panel: "Pump Control Center", tag: "PCC-1", rev: "C", from: "B", by: "Erik Lund", date: "2026-05-29", status: "draft", note: "Document failed contactor C-201 replacement (fault).", sheets: 2 },
];

export const fixtureSheets: Sheet[] = [
  { n: "001", title: "Cover / Index" },
  { n: "002", title: "Symbol Legend" },
  { n: "003", title: "Single-Line Diagram" },
  { n: "004", title: "Power — Incomer & Main" },
  { n: "005", title: "Power — Motor Feeders" },
  { n: "006", title: "Power — VFD Section" },
  { n: "007", title: "Control — PLC I/O" },
  { n: "008", title: "Control — Terminal Plan" },
  { n: "009", title: "Panel Layout / GA" },
  { n: "010", title: "Bill of Materials" },
];

export const fixtureActivity: ActivityItem[] = [
  { who: "Erik Lund", wi: "EL", act: "reported a fault on", target: "PCC-1", sub: "Contactor C-201 not pulling in", time: "08:31", tone: "fault", icon: "alert-triangle" },
  { who: "Priya Raman", wi: "PR", act: "submitted revision F draft for", target: "MCC-3", sub: "2 sheets changed", time: "08:02", tone: "draft", icon: "git-branch" },
  { who: "Dan Okafor", wi: "DO", act: "approved revision E on", target: "MCC-3", sub: "Overload relay range update", time: "Yesterday 16:48", tone: "ok", icon: "check-circle" },
  { who: "Erik Lund", wi: "EL", act: "scanned QR label for", target: "VFD-B", sub: "Field access — Plant 1", time: "Yesterday 11:20", tone: "accent", icon: "scan-line" },
  { who: "Mara Voss", wi: "MV", act: "generated 12 labels for", target: "Plant 2 — Eastgate", sub: "Batch export · PDF", time: "Yesterday 09:15", tone: "idle", icon: "qr-code" },
  { who: "Sofia Marchetti", wi: "SM", act: "uploaded as-built markups to", target: "PDP-2A", sub: "4 files · 18.2 MB", time: "2 days ago", tone: "idle", icon: "upload" },
];

export const fixtureCompany = {
  id: "c1",
  name: "NorthForge Automation",
  slug: "northforge",
  short_name: "NORTHFORGE",
  standards_profile: "iec" as const,
};
