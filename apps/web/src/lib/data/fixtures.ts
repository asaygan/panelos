// Fixture data ported from /tmp/panelhub_design/panelos/project/ph-data.js
// Used as fallback when the API isn't reachable (loading states, Storybook).

import type {
  ActivityItem,
  Component,
  Location,
  Panel,
  PanelSet,
  Revision,
  RevisionRequest,
  Section,
  SectionType,
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
  { id: "l_wtp", company_id: "c1", code: "WTP", name: "Riverside Water Treatment", sub: "Hamilton, ON" },
  { id: "l_sms", company_id: "c1", code: "STL", name: "Eastgate Steel Works", sub: "Buffalo, NY" },
  { id: "l_pm3", company_id: "c1", code: "PPR", name: "Northmill Paper Plant", sub: "Hamilton, ON" },
  { id: "l_bgp", company_id: "c1", code: "BIO", name: "Green Valley Biogas", sub: "Welland, ON" },
  { id: "l_pkg", company_id: "c1", code: "PKG", name: "Lakeside Packaging", sub: "Burlington, ON" },
];

export const fixturePanelSets: PanelSet[] = [
  { id: "set_wtp", name: "Water Treatment Plant Electrical System", code: "WTP", location_id: "l_wtp" },
  { id: "set_sms", name: "Steel Melt Shop Electrical System", code: "SMS", location_id: "l_sms" },
  { id: "set_pm3", name: "Paper Machine Line 3", code: "PM3", location_id: "l_pm3" },
  { id: "set_bgp", name: "Biogas Plant Electrical System", code: "BGP", location_id: "l_bgp" },
  { id: "set_pkg", name: "Packaging Machine Electrical System", code: "PKG", location_id: "l_pkg" },
];

/** Build typed sections for a panel from (type, name) tuples. */
function sects(panelId: string, items: [SectionType, string][]): Section[] {
  return items.map(([section_type, name], i) => ({
    id: `${panelId}-s${i}`,
    panel_id: panelId,
    section_type,
    name,
    position: i,
  }));
}

export const fixturePanels: Panel[] = [
  // ── Water Treatment Plant ──────────────────────────────────────────────
  { id: "p_wtp_mdb", company_id: "c1", panel_set_id: "set_wtp", location_id: "l_wtp", qr_token: "qrwtpmdb", name: "Main Distribution Board", serial: "WTP-MDB-0001", tag: "WTP-MDB", loc: "Riverside Water Treatment", area: "MV Room", volt: "400V", amp: "2500A", phase: "3Ø 4W", mfr: "Schneider Electric", enclosure: "IP54", status: "in_service", install: "2021-03-14", updated: "2026-05-26 09:12", by: "Dan Okafor", issues: 0, scanned: "2026-05-29 07:40", sections: sects("p_wtp_mdb", [["incoming", "Incoming Section"], ["generator", "Generator Coupling"], ["distribution", "Distribution Section"]]) },
  { id: "p_wtp_bmcc", company_id: "c1", panel_set_id: "set_wtp", location_id: "l_wtp", qr_token: "qrwtpbmcc", name: "Blower MCC", serial: "WTP-BMCC-0002", tag: "WTP-BMCC", loc: "Riverside Water Treatment", area: "Blower Hall", volt: "400V", amp: "800A", phase: "3Ø 3W", mfr: "Siemens", enclosure: "IP42", rev: "E", revCount: 5, status: "installed", comps: 10, install: "2021-08-02", updated: "2026-05-28 16:48", by: "Priya Raman", issues: 2, scanned: "2026-05-29 06:55", sections: sects("p_wtp_bmcc", [["feeder", "Blower-1 Feeder"], ["feeder", "Blower-2 Feeder"], ["vfd", "VFD Section"]]) },
  { id: "p_wtp_pmcc", company_id: "c1", panel_set_id: "set_wtp", location_id: "l_wtp", qr_token: "qrwtppmcc", name: "Pump MCC", serial: "WTP-PMCC-0003", tag: "WTP-PMCC", loc: "Riverside Water Treatment", area: "Pump Room", volt: "400V", amp: "630A", phase: "3Ø 3W", mfr: "ABB", enclosure: "IP54", status: "engineering", install: "2021-11-19", updated: "2026-05-29 05:30", by: "Erik Lund", issues: 1, scanned: "2026-05-29 05:31", sections: sects("p_wtp_pmcc", [["feeder", "Pump-1 Feeder"], ["feeder", "Pump-2 Feeder"], ["softstarter", "Softstarter Section"]]) },
  { id: "p_wtp_plc", company_id: "c1", panel_set_id: "set_wtp", location_id: "l_wtp", qr_token: "qrwtpplc", name: "PLC Panel", serial: "WTP-PLC-0004", tag: "WTP-PLC", loc: "Riverside Water Treatment", area: "Control Room", volt: "230V", amp: "63A", phase: "1Ø", mfr: "Siemens", enclosure: "IP55", status: "in_service", install: "2021-03-20", updated: "2026-05-12 11:20", by: "Mara Voss", issues: 0, scanned: "2026-05-24 14:02", sections: sects("p_wtp_plc", [["plc_cpu", "CPU Section"], ["plc_io", "IO Section"], ["network", "Network Section"]]) },
  // ── Steel Melt Shop ────────────────────────────────────────────────────
  { id: "p_sms_mcc", company_id: "c1", panel_set_id: "set_sms", location_id: "l_sms", qr_token: "qrsmsmcc", name: "Main MCC", serial: "SMS-MCC-0001", tag: "SMS-MCC", loc: "Eastgate Steel Works", area: "Melt Bay", volt: "690V", amp: "4000A", phase: "3Ø 3W", mfr: "ABB", enclosure: "IP42", status: "in_service", install: "2020-02-11", updated: "2026-05-27 13:05", by: "Priya Raman", issues: 0, scanned: "2026-05-28 22:10", sections: sects("p_sms_mcc", [["incoming", "Incoming Section"], ["feeder", "Furnace Feeders"], ["distribution", "Distribution Section"]]) },
  { id: "p_sms_fdp", company_id: "c1", panel_set_id: "set_sms", location_id: "l_sms", qr_token: "qrsmsfdp", name: "Furnace Drive Panel", serial: "SMS-FDP-0002", tag: "SMS-FDP", loc: "Eastgate Steel Works", area: "Furnace Hall", volt: "690V", amp: "2500A", phase: "3Ø 3W", mfr: "Siemens", enclosure: "IP42", status: "installed", install: "2020-03-01", updated: "2026-05-25 08:44", by: "Dan Okafor", issues: 1, scanned: "2026-05-23 10:15", sections: sects("p_sms_fdp", [["vfd", "Converter Section"], ["vfd", "Drive Section"], ["custom", "Cooling Section"]]) },
  { id: "p_sms_rmcc", company_id: "c1", panel_set_id: "set_sms", location_id: "l_sms", qr_token: "qrsmsrmcc", name: "Rolling Mill MCC", serial: "SMS-RMCC-0003", tag: "SMS-RMCC", loc: "Eastgate Steel Works", area: "Rolling Mill", volt: "400V", amp: "1600A", phase: "3Ø 3W", mfr: "Schneider Electric", enclosure: "IP54", status: "in_service", install: "2020-06-15", updated: "2026-05-20 15:36", by: "Erik Lund", issues: 0, scanned: "2026-05-29 04:20", sections: sects("p_sms_rmcc", [["feeder", "Mill Stand Feeders"], ["feeder", "Hydraulic Feeders"], ["feeder", "Auxiliary Feeders"]]) },
  { id: "p_sms_aplc", company_id: "c1", panel_set_id: "set_sms", location_id: "l_sms", qr_token: "qrsmsaplc", name: "Automation PLC Panel", serial: "SMS-APLC-0004", tag: "SMS-APLC", loc: "Eastgate Steel Works", area: "Control Room", volt: "230V", amp: "63A", phase: "1Ø", mfr: "Siemens", enclosure: "IP55", status: "in_service", install: "2020-02-20", updated: "2026-05-18 09:55", by: "Mara Voss", issues: 0, scanned: "2026-05-27 18:30", sections: sects("p_sms_aplc", [["plc_cpu", "CPU Section"], ["plc_io", "Remote IO Section"], ["network", "Communication Section"]]) },
  // ── Paper Machine Line 3 ───────────────────────────────────────────────
  { id: "p_pm3_mdb", company_id: "c1", panel_set_id: "set_pm3", location_id: "l_pm3", qr_token: "qrpm3mdb", name: "Main Distribution Board", serial: "PM3-MDB-0001", tag: "PM3-MDB", loc: "Northmill Paper Plant", area: "Electrical Room", volt: "400V", amp: "2000A", phase: "3Ø 4W", mfr: "Eaton", enclosure: "IP54", status: "in_service", install: "2019-05-17", updated: "2026-03-30 10:00", by: "Dan Okafor", issues: 0, scanned: "2026-04-02 12:00", sections: sects("p_pm3_mdb", [["incoming", "Incoming Section"], ["distribution", "Distribution Section"]]) },
  { id: "p_pm3_dmcc", company_id: "c1", panel_set_id: "set_pm3", location_id: "l_pm3", qr_token: "qrpm3dmcc", name: "Dryer Section MCC", serial: "PM3-DMCC-0002", tag: "PM3-DMCC", loc: "Northmill Paper Plant", area: "Dryer Section", volt: "400V", amp: "1200A", phase: "3Ø 3W", mfr: "ABB", enclosure: "IP42", status: "in_service", install: "2019-07-14", updated: "2026-05-15 14:22", by: "Priya Raman", issues: 0, scanned: "2026-05-26 09:00", sections: sects("p_pm3_dmcc", [["feeder", "Dryer Motors"], ["feeder", "Fan Feeders"], ["vfd", "VFD Section"]]) },
  { id: "p_pm3_pmcc", company_id: "c1", panel_set_id: "set_pm3", location_id: "l_pm3", qr_token: "qrpm3pmcc", name: "Press Section MCC", serial: "PM3-PMCC-0003", tag: "PM3-PMCC", loc: "Northmill Paper Plant", area: "Press Section", volt: "400V", amp: "1000A", phase: "3Ø 3W", mfr: "Siemens", enclosure: "IP42", status: "installed", install: "2019-10-28", updated: "2026-05-22 16:11", by: "Mara Voss", issues: 1, scanned: "2026-05-25 11:45", sections: sects("p_pm3_pmcc", [["vfd", "Press Drives"], ["feeder", "Hydraulic Section"], ["feeder", "Utility Feeders"]]) },
  { id: "p_pm3_plc", company_id: "c1", panel_set_id: "set_pm3", location_id: "l_pm3", qr_token: "qrpm3plc", name: "PLC & SCADA Panel", serial: "PM3-PLC-0004", tag: "PM3-PLC", loc: "Northmill Paper Plant", area: "Control Room", volt: "230V", amp: "63A", phase: "1Ø", mfr: "Siemens", enclosure: "IP55", status: "in_service", install: "2019-05-30", updated: "2026-05-28 11:30", by: "Erik Lund", issues: 0, scanned: "2026-05-28 19:05", sections: sects("p_pm3_plc", [["plc_cpu", "CPU Section"], ["network", "Network Section"], ["ups", "UPS Section"]]) },
  // ── Biogas Plant ───────────────────────────────────────────────────────
  { id: "p_bgp_mcc", company_id: "c1", panel_set_id: "set_bgp", location_id: "l_bgp", qr_token: "qrbgpmcc", name: "Main MCC", serial: "BGP-MCC-0001", tag: "BGP-MCC", loc: "Green Valley Biogas", area: "Switchroom", volt: "400V", amp: "1600A", phase: "3Ø 4W", mfr: "Schneider Electric", enclosure: "IP54", status: "in_service", install: "2022-04-08", updated: "2026-05-20 15:36", by: "Dan Okafor", issues: 0, scanned: "2026-05-29 04:20", sections: sects("p_bgp_mcc", [["incoming", "Incoming Section"], ["generator", "Generator Coupling"], ["distribution", "Distribution Section"]]) },
  { id: "p_bgp_bmcc", company_id: "c1", panel_set_id: "set_bgp", location_id: "l_bgp", qr_token: "qrbgpbmcc", name: "Blower MCC", serial: "BGP-BMCC-0002", tag: "BGP-BMCC", loc: "Green Valley Biogas", area: "Digester Area", volt: "400V", amp: "630A", phase: "3Ø 3W", mfr: "ABB", enclosure: "IP54", status: "in_service", install: "2022-05-01", updated: "2026-05-18 09:55", by: "Mara Voss", issues: 0, scanned: "2026-05-27 18:30", sections: sects("p_bgp_bmcc", [["feeder", "Blower Feeders"], ["vfd", "VFD Section"], ["feeder", "Auxiliary Feeders"]]) },
  { id: "p_bgp_chp", company_id: "c1", panel_set_id: "set_bgp", location_id: "l_bgp", qr_token: "qrbgpchp", name: "CHP Panel", serial: "BGP-CHP-0003", tag: "BGP-CHP", loc: "Green Valley Biogas", area: "CHP Container", volt: "400V", amp: "1000A", phase: "3Ø 3W", mfr: "Siemens", enclosure: "IP54", status: "installed", install: "2022-06-10", updated: "2026-05-22 16:11", by: "Priya Raman", issues: 1, scanned: "2026-05-25 11:45", sections: sects("p_bgp_chp", [["custom", "Synchronization Section"], ["protection", "Generator Protection"], ["metering", "Metering Section"]]) },
  { id: "p_bgp_plc", company_id: "c1", panel_set_id: "set_bgp", location_id: "l_bgp", qr_token: "qrbgpplc", name: "PLC Panel", serial: "BGP-PLC-0004", tag: "BGP-PLC", loc: "Green Valley Biogas", area: "Control Room", volt: "230V", amp: "63A", phase: "1Ø", mfr: "Siemens", enclosure: "IP55", status: "in_service", install: "2022-04-15", updated: "2026-05-12 11:20", by: "Erik Lund", issues: 0, scanned: "2026-05-24 14:02", sections: sects("p_bgp_plc", [["plc_cpu", "CPU Section"], ["plc_io", "IO Section"], ["network", "Communication Section"]]) },
  // ── Packaging Machine (OEM) ────────────────────────────────────────────
  { id: "p_pkg_mcp", company_id: "c1", panel_set_id: "set_pkg", location_id: "l_pkg", qr_token: "qrpkgmcp", name: "Main Control Panel", serial: "PKG-MCP-0001", tag: "PKG-MCP", loc: "Lakeside Packaging", area: "Machine Frame", volt: "400V", amp: "125A", phase: "3Ø 4W", mfr: "Rittal", enclosure: "IP55", status: "in_service", install: "2023-01-30", updated: "2026-05-28 11:30", by: "Mara Voss", issues: 0, scanned: "2026-05-28 19:05", sections: sects("p_pkg_mcp", [["distribution", "Power Section"], ["plc_cpu", "PLC Section"], ["terminal", "Terminal Section"]]) },
  { id: "p_pkg_ops", company_id: "c1", panel_set_id: "set_pkg", location_id: "l_pkg", qr_token: "qrpkgops", name: "Operator Station", serial: "PKG-OPS-0002", tag: "PKG-OPS", loc: "Lakeside Packaging", area: "Operator Side", volt: "230V", amp: "16A", phase: "1Ø", mfr: "Rittal", enclosure: "IP65", status: "in_service", install: "2023-02-05", updated: "2026-05-15 14:22", by: "Sofia Marchetti", issues: 0, scanned: "2026-05-26 09:00", sections: sects("p_pkg_ops", [["hmi", "HMI Section"], ["network", "Network Section"]]) },
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
  { id: "rq1", panel: "Blower MCC", tag: "WTP-BMCC", rev: "F", from: "E", by: "Priya Raman", date: "2026-05-29", status: "draft", note: "Add spare feeder breaker CB-110 for a future blower.", sheets: 2 },
  { id: "rq2", panel: "Furnace Drive Panel", tag: "SMS-FDP", rev: "B", from: "A", by: "Dan Okafor", date: "2026-05-28", status: "review", note: "Converter firmware update per drive coordination study CS-2026-04.", sheets: 3 },
  { id: "rq3", panel: "Dryer Section MCC", tag: "PM3-DMCC", rev: "B", from: "A", by: "Erik Lund", date: "2026-05-28", status: "review", note: "Correct CT ratio on dryer metering — field discrepancy reported.", sheets: 1 },
  { id: "rq4", panel: "CHP Panel", tag: "BGP-CHP", rev: "B", from: "A", by: "Erik Lund", date: "2026-05-29", status: "draft", note: "Document generator protection relay setting change.", sheets: 2 },
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
  { who: "Erik Lund", wi: "EL", act: "reported a fault on", target: "WTP-PMCC", sub: "Pump-1 softstarter not engaging", time: "08:31", tone: "fault", icon: "alert-triangle" },
  { who: "Priya Raman", wi: "PR", act: "submitted revision F draft for", target: "WTP-BMCC", sub: "2 sheets changed", time: "08:02", tone: "draft", icon: "git-branch" },
  { who: "Dan Okafor", wi: "DO", act: "approved revision E on", target: "WTP-BMCC", sub: "Overload relay range update", time: "Yesterday 16:48", tone: "ok", icon: "check-circle" },
  { who: "Erik Lund", wi: "EL", act: "scanned QR label for", target: "PM3-DMCC", sub: "Field access — Northmill Paper", time: "Yesterday 11:20", tone: "accent", icon: "scan-line" },
  { who: "Mara Voss", wi: "MV", act: "generated 8 labels for", target: "Steel Melt Shop", sub: "Batch export · PDF", time: "Yesterday 09:15", tone: "idle", icon: "qr-code" },
  { who: "Sofia Marchetti", wi: "SM", act: "uploaded as-built markups to", target: "SMS-FDP", sub: "4 files · 18.2 MB", time: "2 days ago", tone: "idle", icon: "upload" },
];

export const fixtureCompany = {
  id: "c1",
  name: "NorthForge Automation",
  slug: "northforge",
  short_name: "NORTHFORGE",
  standards_profile: "iec" as const,
};
