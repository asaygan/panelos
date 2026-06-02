// Static demo/fallback dataset for the public `/demo` route and components
// that need a sample panel (label preview, branding-section, …).
//
// Rewritten for the 4-level Project → SystemGroup → Panel → Cabinet hierarchy.
// Lifecycle status lives on Project + Group only; Panel.status is a deprecated
// placeholder kept for backwards-compat with legacy presentational components.

import type {
  ActivityItem,
  Cabinet,
  Component,
  Location,
  Panel,
  Project,
  ProjectNode,
  Revision,
  RevisionRequest,
  Sheet,
  SystemGroup,
  SystemGroupNode,
  User,
} from "@/lib/api/types";

export const fixtureUsers: User[] = [
  { id: "u1", name: "Mara Voss", initials: "MV", email: "m.voss@northforge.io", color: "#3b82f6", last: "Online now", status: "active" },
  { id: "u2", name: "Dan Okafor", initials: "DO", email: "d.okafor@northforge.io", color: "#1f9d57", last: "4m ago", status: "active" },
  { id: "u3", name: "Priya Raman", initials: "PR", email: "p.raman@northforge.io", color: "#c97a0e", last: "22m ago", status: "active" },
  { id: "u4", name: "Erik Lund", initials: "EL", email: "e.lund@northforge.io", color: "#7c5cff", last: "1h ago", status: "active" },
];

export const fixtureUserRoles: Record<string, string> = {
  u1: "Owner",
  u2: "Engineer",
  u3: "Engineer",
  u4: "Technician",
};

export const fixtureLocations: Location[] = [
  { id: "l_hdh", company_id: "c1", code: "HDH", name: "Eastgate Steel Works", sub: "Buffalo, NY" },
  { id: "l_wtp", company_id: "c1", code: "WTP", name: "Riverside Water Treatment", sub: "Hamilton, ON" },
];

export const fixtureProjects: Project[] = [
  {
    id: "proj_hdh",
    name: "Haddehane",
    code: "HDH",
    customer: "Eastgate Steel",
    site: "Buffalo, NY",
    location_id: "l_hdh",
    lifecycle_status: "commissioned",
  },
  {
    id: "proj_wtp",
    name: "Water Treatment Plant",
    code: "WTP",
    customer: "Riverside Water Authority",
    site: "Hamilton, ON",
    location_id: "l_wtp",
    lifecycle_status: "in_service",
  },
];

export const fixtureSystemGroups: SystemGroup[] = [
  { id: "g_hdh_mcc", project_id: "proj_hdh", name: "MCC", code: "MCC", group_type: "mcc", lifecycle_status: "commissioned" },
  { id: "g_hdh_lvdp", project_id: "proj_hdh", name: "LVDP", code: "LVDP", group_type: "lvdp", lifecycle_status: "installed" },
  { id: "g_hdh_plc", project_id: "proj_hdh", name: "PLC", code: "PLC", group_type: "plc", lifecycle_status: "commissioned" },
  { id: "g_wtp_mcc", project_id: "proj_wtp", name: "MCC", code: "MCC", group_type: "mcc", lifecycle_status: "in_service" },
  { id: "g_wtp_plc", project_id: "proj_wtp", name: "PLC", code: "PLC", group_type: "plc", lifecycle_status: "in_service" },
];

function makeCabinets(panelId: string, names: [string, string][]): Cabinet[] {
  return names.map(([name, code], i) => ({
    id: `${panelId}-cab${i}`,
    panel_id: panelId,
    name,
    code,
    position: i,
  }));
}

const PANEL_BASE: Omit<Panel, "id" | "tag" | "serial" | "name" | "system_group_id" | "qr_token" | "cabinets" | "loc"> = {
  company_id: "c1",
  location_id: "l_hdh",
  customer: "Eastgate Steel",
  area: "Plant Wide",
  volt: "400V",
  amp: "800A",
  phase: "3Ø 3W",
  mfr: "Siemens",
  enclosure: "IP42",
  status: "in_service",
  install: "2025-03-14",
  updated: "2026-06-02 09:12",
  by: "Dan Okafor",
  issues: 0,
  scanned: "2026-06-02 07:40",
};

export const fixturePanels: Panel[] = [
  { ...PANEL_BASE, id: "p_hdh_mcc_haz", system_group_id: "g_hdh_mcc", loc: "Eastgate Steel Works", tag: "HDH-MCC-HAZ", serial: "HDH-MCC-HAZ-0001", name: "Hazırlama MCC Panosu", qr_token: "qrhdhmcchaz", cabinets: makeCabinets("p_hdh_mcc_haz", [["C1", "C1"], ["C2", "C2"], ["C3", "C3"]]) },
  { ...PANEL_BASE, id: "p_hdh_mcc_pkg", system_group_id: "g_hdh_mcc", loc: "Eastgate Steel Works", tag: "HDH-MCC-PKG", serial: "HDH-MCC-PKG-0002", name: "Paketleme MCC Panosu", qr_token: "qrhdhmccpkg", cabinets: makeCabinets("p_hdh_mcc_pkg", [["C1", "C1"], ["C2", "C2"], ["C3", "C3"]]) },
  { ...PANEL_BASE, id: "p_hdh_lvdp_haz", system_group_id: "g_hdh_lvdp", loc: "Eastgate Steel Works", tag: "HDH-LVDP-HAZ", serial: "HDH-LVDP-HAZ-0001", name: "Hazırlama Trafo Dağıtım Panosu", qr_token: "qrhdhlvdphaz", cabinets: makeCabinets("p_hdh_lvdp_haz", [["C1", "C1"], ["C2", "C2"]]) },
  { ...PANEL_BASE, id: "p_hdh_plc_01", system_group_id: "g_hdh_plc", loc: "Eastgate Steel Works", tag: "HDH-PLC-01", serial: "HDH-PLC-01-0001", name: "Hat 1 PLC Panosu", qr_token: "qrhdhplc01", cabinets: makeCabinets("p_hdh_plc_01", [["CPU", "C1"], ["I/O", "C2"]]) },
  { ...PANEL_BASE, id: "p_wtp_mcc_blower", system_group_id: "g_wtp_mcc", location_id: "l_wtp", loc: "Riverside Water Treatment", tag: "WTP-MCC-BMCC", serial: "WTP-MCC-BMCC-0002", name: "Blower MCC", qr_token: "qrwtpmccbmcc", cabinets: makeCabinets("p_wtp_mcc_blower", [["Blower-1", "C1"], ["Blower-2", "C2"], ["VFD", "C3"]]) },
  { ...PANEL_BASE, id: "p_wtp_plc_01", system_group_id: "g_wtp_plc", location_id: "l_wtp", loc: "Riverside Water Treatment", tag: "WTP-PLC-01", serial: "WTP-PLC-01-0001", name: "PLC Panel", qr_token: "qrwtpplc01", cabinets: makeCabinets("p_wtp_plc_01", [["CPU", "C1"], ["I/O", "C2"], ["Network", "C3"]]) },
];

export const fixtureCabinets: Cabinet[] = fixturePanels.flatMap((p) => p.cabinets ?? []);

export const fixtureComponents: Component[] = [
  { slot: "1A", ref: "CB-101", desc: "Main Circuit Breaker", part: "Siemens 3VA2225-5HL32", rating: "250A", type: "MCCB", status: "ok" },
  { slot: "2A", ref: "C-201", desc: "Contactor — Pump M1", part: "Siemens 3RT2026-1BB40", rating: "25A", type: "Contactor", status: "warn" },
  { slot: "3B", ref: "VFD-301", desc: "Drive — Blower B1", part: "ABB ACS580-01-12A2-4", rating: "5.5kW", type: "VFD", status: "ok" },
  { slot: "4A", ref: "PLC-401", desc: "PLC CPU", part: "Siemens 6ES7 215-1AG40-0XB0", rating: "24VDC", type: "PLC", status: "ok" },
];

export const fixtureRevisions: Revision[] = [
  { id: "rev-e", rev: "E", date: "2026-05-28", by: "Priya Raman", status: "approved", note: "Replaced OL-201 overload relay range.", files: 3, approver: "Mara Voss" },
  { id: "rev-d", rev: "D", date: "2026-02-15", by: "Dan Okafor", status: "superseded", note: "Added VFD-301; removed legacy soft-starter.", files: 6, approver: "Mara Voss" },
];

export const fixtureRevQueue: RevisionRequest[] = [
  { id: "rq1", panel: "Blower MCC", tag: "WTP-MCC-BMCC", rev: "F", from: "E", by: "Priya Raman", date: "2026-06-02", status: "draft", note: "Add spare feeder breaker.", sheets: 2 },
];

export const fixtureSheets: Sheet[] = [
  { n: "001", title: "Cover / Index" },
  { n: "002", title: "Symbol Legend" },
  { n: "003", title: "Single-Line Diagram" },
];

export const fixtureActivity: ActivityItem[] = [
  { who: "Dan Okafor", wi: "DO", act: "approved revision E on", target: "WTP-MCC-BMCC", sub: "Overload relay range update", time: "Yesterday 16:48", tone: "ok", icon: "check-circle" },
  { who: "Erik Lund", wi: "EL", act: "scanned QR label for", target: "HDH-MCC-PKG", sub: "Field access — Haddehane", time: "Yesterday 11:20", tone: "accent", icon: "scan-line" },
];

export const fixtureCompany = {
  id: "c1",
  name: "NorthForge Automation",
  slug: "northforge",
  short_name: "NORTHFORGE",
  standards_profile: "iec" as const,
};

/** Pre-assembled 4-level tree (Project → Group → Panel → Cabinet) for /demo. */
export const fixtureTree: ProjectNode[] = fixtureProjects.map((proj) => ({
  ...proj,
  groups: fixtureSystemGroups
    .filter((g) => g.project_id === proj.id)
    .map<SystemGroupNode>((g) => ({
      ...g,
      panels: fixturePanels
        .filter((p) => p.system_group_id === g.id)
        .map((p) => ({ ...p, cabinets: p.cabinets ?? [] })),
    })),
}));
