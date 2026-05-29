import type { BadgeTone } from "@/components/primitives/badge";
import type { MemberStatus, Role } from "@/lib/api/types";

/** Role ordering used for filters, the matrix columns and selects. */
export const ROLE_ORDER: Role[] = ["owner", "admin", "engineer", "technician", "viewer"];

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  engineer: "Engineer",
  technician: "Technician",
  viewer: "Viewer",
};

export const ROLE_TONE: Record<Role, BadgeTone> = {
  owner: "accent",
  admin: "purple",
  engineer: "ok",
  technician: "warn",
  viewer: "idle",
};

/** Short per-role blurb shown under role selects (fallback when /roles has none). */
export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "Full control of the organization, billing and all members.",
  admin: "Manage members, panels and approvals (cannot act on Owners).",
  engineer: "Create and approve revisions, edit panels and generate labels.",
  technician: "Scan QR codes, view approved schematics and report issues.",
  viewer: "Read-only access to panels and approved schematics.",
};

export const STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
};

export const STATUS_TONE: Record<MemberStatus, BadgeTone> = {
  active: "ok",
  invited: "accent",
  suspended: "fault",
};
