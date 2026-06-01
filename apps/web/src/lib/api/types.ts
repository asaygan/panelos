// View-model types consumed by the presentational components. API DTOs come from
// the generated OpenAPI schema (`@panelos/types/generated`, aliased in endpoints.ts);
// the adapters in `adapters.ts` map those generated DTOs into the view-models below.
// Only UI-shaped types live here — no hand-written mirrors of API request/response
// schemas (those are sourced from codegen).

import type { PanelStatus, RevisionStatus } from "@/lib/utils/status";

export interface User {
  id: string;
  email: string;
  name: string;
  initials: string;
  color?: string;
  last?: string;
  status?: "active" | "invited";
}

export type Role = "owner" | "admin" | "engineer" | "technician" | "viewer";

export type MemberStatus = "active" | "invited" | "suspended";

export interface LocationChip {
  id: string;
  code: string;
  name: string;
}

/** A member of the organization, mapped from MemberOut. */
export interface Member {
  id: string;
  membershipId: string;
  userId: string;
  email: string;
  name: string;
  initials: string;
  color?: string;
  avatarUrl?: string | null;
  role: Role;
  status: MemberStatus;
  lastActive: string;
  locations: LocationChip[];
  invitedAt?: string | null;
  acceptedAt?: string | null;
}

export interface RolePermission {
  key: string;
  label: string;
  description: string;
}

export interface RoleView {
  role: Role;
  label: string;
  permissions: RolePermission[];
  memberCount: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  actionLabel: string;
  actor: string;
  actorEmail?: string | null;
  targetType: string;
  targetId: string;
  meta: Record<string, unknown>;
  time: string;
}

export interface Membership {
  id: string;
  user_id: string;
  company_id: string;
  role: Role;
  invited_at?: string | null;
  accepted_at?: string | null;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  short_name: string;
  standards_profile: "iec" | "ul";
  logo_key?: string | null;
}

export interface Location {
  id: string;
  company_id: string;
  code: string;
  name: string;
  region?: string;
  sub?: string;
}

/** The 16 functional section types (matches the API `section_type` enum). */
export type SectionType =
  | "incoming"
  | "distribution"
  | "feeder"
  | "vfd"
  | "softstarter"
  | "capacitor"
  | "metering"
  | "plc_cpu"
  | "plc_io"
  | "network"
  | "ups"
  | "terminal"
  | "hmi"
  | "protection"
  | "generator"
  | "custom";

export interface Section {
  id: string;
  panel_id: string;
  section_type: SectionType;
  name: string;
  position: number;
  description?: string;
}

/** A Panel Set — facility / process system grouping above panels. */
export interface PanelSet {
  id: string;
  name: string;
  code?: string;
  description?: string;
  location_id?: string | null;
}

export interface Panel {
  id: string;
  company_id: string;
  location_id: string;
  /** Parent Panel Set (facility). Undefined for loose/unassigned panels. */
  panel_set_id?: string | null;
  tag: string;
  serial: string;
  qr_token: string;
  name: string;
  customer?: string;
  loc: string;
  area: string;
  volt: string;
  amp: string;
  phase: string;
  mfr: string;
  enclosure: string;
  /** Active revision letter. Undefined in list views where it isn't cheaply resolvable. */
  rev?: string;
  /** Total revision count. Undefined in list views. */
  revCount?: number;
  status: PanelStatus;
  /** Component count. Undefined in list views (only resolved on panel detail). */
  comps?: number;
  /** Sections inside this panel (present on tree / detail). */
  sections?: Section[];
  install: string;
  updated: string;
  by: string;
  issues: number;
  scanned: string;
  active_revision_id?: string | null;
}

/** A Panel Set with its panels (tree node). */
export interface PanelSetNode extends PanelSet {
  panels: Panel[];
}

export interface Component {
  slot: string;
  ref: string;
  desc: string;
  part: string;
  rating: string;
  type: string;
  status: "ok" | "warn";
}

export interface Revision {
  id: string;
  rev: string;
  date: string;
  by: string;
  status: RevisionStatus;
  note: string;
  files: number;
  approver: string;
}

export interface RevisionRequest {
  id: string;
  panel: string;
  tag: string;
  rev: string;
  from: string;
  by: string;
  date: string;
  status: "draft" | "review";
  note: string;
  sheets: number;
}

export interface Sheet {
  n: string;
  title: string;
}

export interface ActivityItem {
  who: string;
  wi: string;
  act: string;
  target: string;
  sub: string;
  time: string;
  tone: "ok" | "warn" | "fault" | "idle" | "draft" | "accent";
  icon: string;
}

