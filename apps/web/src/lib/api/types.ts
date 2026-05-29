// TODO: replace with generated types from `pnpm codegen` -> src/generated/openapi.ts
// Hand-written mirrors of the API plan section 3 schema.

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

export interface Panel {
  id: string;
  company_id: string;
  location_id: string;
  tag: string;
  serial: string;
  qr_token: string;
  name: string;
  loc: string;
  area: string;
  volt: string;
  amp: string;
  phase: string;
  mfr: string;
  enclosure: string;
  rev: string;
  revCount: number;
  status: PanelStatus;
  comps: number;
  install: string;
  updated: string;
  by: string;
  issues: number;
  scanned: string;
  active_revision_id?: string | null;
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

export interface ScanEvent {
  id: string;
  panel_id: string;
  user_id?: string | null;
  at: string;
  device?: string;
  ip?: string;
}

export interface Label {
  id: string;
  panel_id: string;
  template: "engraved" | "print";
  size: string;
  fields_json: Record<string, boolean>;
  output_storage_key?: string;
  format: "png" | "svg" | "pdf";
}

export interface SearchHit {
  type: "panel" | "nav";
  id: string;
  label: string;
  sub?: string;
  status?: PanelStatus;
}

export interface PresignedUpload {
  url: string;
  fields?: Record<string, string>;
  key: string;
}
