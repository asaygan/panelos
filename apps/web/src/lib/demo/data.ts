// Demo dataset for the public, no-auth /demo route.
// 100% static mock — no API calls, no cookies, no secrets. Clearly fictional.
// Shapes mirror the view-models in src/lib/api/types.ts so the real presentational
// components can be reused as-is.

import {
  fixturePanels,
  fixturePanelSets,
  fixtureLocations,
  fixtureRevisions,
  fixtureRevQueue,
  fixtureComponents,
  fixtureSheets,
} from "@/lib/data/fixtures";
import {
  defaultEngravedLayout,
  defaultPrintLayout,
  type LabelLayout,
} from "@/lib/api/label-layout";
import type {
  ActivityItem,
  AuditEntry,
  Component,
  Location,
  Member,
  Panel,
  PanelSet,
  PanelSetNode,
  Revision,
  RevisionRequest,
  RoleView,
  Sheet,
} from "@/lib/api/types";

// ── Company / current user ──────────────────────────────────────────────────────
export const demoCompany = {
  id: "demo-co",
  name: "NorthForge Automation · DEMO",
  slug: "northforge-demo",
  short_name: "NORTHFORGE",
  standards_profile: "iec" as const,
  logo_key: null,
};

export const demoUser = {
  id: "demo-user",
  email: "alex.rivera@northforge.demo",
  name: "Alex Rivera",
  initials: "AR",
  color: "#7c5cff",
  status: "active" as const,
};

// ── Panels / sets / locations / components / sheets ─────────────────────────────
export const demoPanels: Panel[] = fixturePanels;
export const demoPanelSets: PanelSet[] = fixturePanelSets;
export const demoLocations: Location[] = fixtureLocations;
export const demoComponents: Component[] = fixtureComponents;
export const demoSheets: Sheet[] = fixtureSheets;
export const demoRevisions: Revision[] = fixtureRevisions;
export const demoRevQueue: RevisionRequest[] = fixtureRevQueue;

// Pre-assembled Panel Set → Panel → Section tree for the offline /demo route.
export const demoTree: PanelSetNode[] = demoPanelSets.map((s) => ({
  ...s,
  panels: demoPanels.filter((p) => p.panel_set_id === s.id),
}));

// ── Activity feed (dashboard + panel) ───────────────────────────────────────────
export const demoActivity: ActivityItem[] = [
  { who: "Erik Lund", wi: "EL", act: "reported a fault on", target: "WTP-PMCC", sub: "Pump-1 softstarter not engaging", time: "08:31", tone: "fault", icon: "alert-triangle" },
  { who: "Priya Raman", wi: "PR", act: "submitted revision F draft for", target: "WTP-BMCC", sub: "2 sheets changed", time: "08:02", tone: "draft", icon: "git-branch" },
  { who: "Dan Okafor", wi: "DO", act: "approved revision E on", target: "WTP-BMCC", sub: "Overload relay range update", time: "Yesterday 16:48", tone: "ok", icon: "check-circle" },
  { who: "Erik Lund", wi: "EL", act: "scanned QR label for", target: "PM3-DMCC", sub: "Field access — Northmill Paper", time: "Yesterday 11:20", tone: "accent", icon: "scan-line" },
  { who: "Mara Voss", wi: "MV", act: "generated 8 labels for", target: "Steel Melt Shop", sub: "Batch export · PDF", time: "Yesterday 09:15", tone: "idle", icon: "qr-code" },
  { who: "Sofia Marchetti", wi: "SM", act: "uploaded as-built markups to", target: "SMS-FDP", sub: "4 files · 18.2 MB", time: "2 days ago", tone: "idle", icon: "upload" },
];

// ── Members (8) ─────────────────────────────────────────────────────────────────
function loc(id: string) {
  const l = demoLocations.find((x) => x.id === id)!;
  return { id: l.id, code: l.code, name: l.name };
}

export const demoMembers: Member[] = [
  { id: "m1", membershipId: "mm1", userId: "u1", email: "m.voss@northforge.demo", name: "Mara Voss", initials: "MV", color: "#3b82f6", role: "owner", status: "active", lastActive: "Online now", locations: [] },
  { id: "m2", membershipId: "mm2", userId: "u2", email: "d.okafor@northforge.demo", name: "Dan Okafor", initials: "DO", color: "#1f9d57", role: "admin", status: "active", lastActive: "4m ago", locations: [] },
  { id: "m3", membershipId: "mm3", userId: "u3", email: "p.raman@northforge.demo", name: "Priya Raman", initials: "PR", color: "#c97a0e", role: "engineer", status: "active", lastActive: "22m ago", locations: [loc("l_wtp"), loc("l_sms")] },
  { id: "m4", membershipId: "mm4", userId: "u4", email: "e.lund@northforge.demo", name: "Erik Lund", initials: "EL", color: "#7c5cff", role: "technician", status: "active", lastActive: "1h ago", locations: [loc("l_pm3")] },
  { id: "m5", membershipId: "mm5", userId: "u5", email: "s.marchetti@northforge.demo", name: "Sofia Marchetti", initials: "SM", color: "#d8412f", role: "technician", status: "active", lastActive: "3h ago", locations: [loc("l_wtp")] },
  { id: "m6", membershipId: "mm6", userId: "u6", email: "j.whitfield@northforge.demo", name: "James Whitfield", initials: "JW", color: "#6b7280", role: "viewer", status: "active", lastActive: "2d ago", locations: [] },
  { id: "m7", membershipId: "mm7", userId: "u7", email: "l.hoffmann@northforge.demo", name: "Lena Hoffmann", initials: "LH", color: "#0ea5e9", role: "engineer", status: "invited", lastActive: "Pending", locations: [loc("l_sms")], invitedAt: "2026-05-27" },
  { id: "m8", membershipId: "mm8", userId: "u8", email: "t.nakamura@northforge.demo", name: "Tomas Nakamura", initials: "TN", color: "#0891b2", role: "technician", status: "suspended", lastActive: "12d ago", locations: [loc("l_bgp")] },
];

// ── Roles + permission catalog (for the matrix) ─────────────────────────────────
const PERMS = {
  view_panels: { key: "view_panels", label: "View panels", description: "Read panel records and approved schematics." },
  edit_panels: { key: "edit_panels", label: "Edit panels", description: "Create and update panel records." },
  create_rev: { key: "create_rev", label: "Create revisions", description: "Draft new revisions." },
  approve_rev: { key: "approve_rev", label: "Approve revisions", description: "Approve or reject revision drafts." },
  upload_sheets: { key: "upload_sheets", label: "Upload schematics", description: "Attach and replace PDF sheets." },
  gen_labels: { key: "gen_labels", label: "Generate labels", description: "Render and batch-print QR labels." },
  scan_qr: { key: "scan_qr", label: "Scan QR codes", description: "Field access via QR scan." },
  manage_users: { key: "manage_users", label: "Manage members", description: "Invite, change roles and suspend members." },
  manage_org: { key: "manage_org", label: "Manage organization", description: "Branding, locations, integrations and billing." },
} as const;

const ALL_PERMS = Object.values(PERMS);

function roleCount(role: Member["role"]) {
  return demoMembers.filter((m) => m.role === role).length;
}

export const demoRoles: RoleView[] = [
  { role: "owner", label: "Owner", memberCount: roleCount("owner"), permissions: ALL_PERMS },
  {
    role: "admin",
    label: "Admin",
    memberCount: roleCount("admin"),
    permissions: [PERMS.view_panels, PERMS.edit_panels, PERMS.create_rev, PERMS.approve_rev, PERMS.upload_sheets, PERMS.gen_labels, PERMS.scan_qr, PERMS.manage_users],
  },
  {
    role: "engineer",
    label: "Engineer",
    memberCount: roleCount("engineer"),
    permissions: [PERMS.view_panels, PERMS.edit_panels, PERMS.create_rev, PERMS.approve_rev, PERMS.upload_sheets, PERMS.gen_labels, PERMS.scan_qr],
  },
  {
    role: "technician",
    label: "Technician",
    memberCount: roleCount("technician"),
    permissions: [PERMS.view_panels, PERMS.upload_sheets, PERMS.scan_qr],
  },
  {
    role: "viewer",
    label: "Viewer",
    memberCount: roleCount("viewer"),
    permissions: [PERMS.view_panels, PERMS.scan_qr],
  },
];

// ── Audit entries ───────────────────────────────────────────────────────────────
export const demoAudit: AuditEntry[] = [
  { id: "a1", action: "member.role_changed", actionLabel: "changed role to Engineer", actor: "Mara Voss", targetType: "membership", targetId: "mm7", meta: { target_email: "l.hoffmann@northforge.demo" }, time: "Today 09:12" },
  { id: "a2", action: "member.invited", actionLabel: "invited a new member", actor: "Dan Okafor", targetType: "membership", targetId: "mm7", meta: { target_email: "l.hoffmann@northforge.demo" }, time: "Yesterday 16:40" },
  { id: "a3", action: "member.suspended", actionLabel: "suspended", actor: "Mara Voss", targetType: "membership", targetId: "mm8", meta: { target_name: "Tomas Nakamura" }, time: "3 days ago" },
  { id: "a4", action: "member.locations_assigned", actionLabel: "assigned locations", actor: "Dan Okafor", targetType: "membership", targetId: "mm3", meta: { target_name: "Priya Raman" }, time: "4 days ago" },
  { id: "a5", action: "member.role_changed", actionLabel: "changed role to Admin", actor: "Mara Voss", targetType: "membership", targetId: "mm2", meta: { target_name: "Dan Okafor" }, time: "1 week ago" },
];

// ── Label templates (engraved + print layouts) ──────────────────────────────────
export interface DemoLabelTemplate {
  id: string;
  name: string;
  concept: "engraved" | "plain";
  size_mm: string;
  is_default: boolean;
  layout: LabelLayout;
}

export const demoLabelTemplates: DemoLabelTemplate[] = [
  { id: "tpl-engraved", name: "Engraved nameplate", concept: "engraved", size_mm: "90x50", is_default: true, layout: defaultEngravedLayout() },
  { id: "tpl-print", name: "Thermal print (B/W)", concept: "plain", size_mm: "90x50", is_default: false, layout: defaultPrintLayout() },
];

// ── Counts for the shell ────────────────────────────────────────────────────────
export const demoCounts = {
  panels: demoPanels.length,
  rev: demoRevQueue.length,
};
