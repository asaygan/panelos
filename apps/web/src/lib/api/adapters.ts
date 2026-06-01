// Pure mappers: API DTOs (snake_case) → the prototype view-model the design
// components already consume. This is the ONLY place field names are bridged.

import type {
  AuditLogDTO,
  ComponentDTO,
  LocationDTO,
  MemberDTO,
  PanelDTO,
  RevisionDTO,
  RoleDTO,
  SheetDTO,
  SearchHitDTO,
} from "./endpoints";
import { formatDate, relativeTime } from "@/lib/utils/format";
import type {
  ActivityItem,
  AuditEntry,
  Component,
  Location,
  Member,
  MemberStatus,
  Panel,
  Revision,
  RevisionRequest,
  Role,
  RoleView,
  Sheet,
} from "./types";
import type { PanelStatus, RevisionStatus } from "@/lib/utils/status";

const PANEL_STATUSES: PanelStatus[] = ["ok", "warn", "fault", "idle"];
const REV_STATUSES: RevisionStatus[] = ["draft", "review", "approved", "superseded", "rejected"];

function asPanelStatus(s: string): PanelStatus {
  return (PANEL_STATUSES as string[]).includes(s) ? (s as PanelStatus) : "idle";
}
function asRevStatus(s: string): RevisionStatus {
  return (REV_STATUSES as string[]).includes(s) ? (s as RevisionStatus) : "draft";
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map of user_id → display name, used to resolve actor UUIDs in revision/audit views. */
export type UserNameMap = Record<string, string>;

/**
 * Resolve an actor identifier to a human-readable name. Never surfaces a raw UUID:
 * if a UUID can't be resolved (members not loaded / out of scope), returns "—".
 */
export function resolveActor(
  raw: string | null | undefined,
  users?: UserNameMap,
): string {
  if (!raw) return "—";
  if (users && users[raw]) return users[raw]!;
  if (UUID_RE.test(raw)) return "—";
  return raw;
}

function fmtDateTime(iso: string | null | undefined): string {
  return formatDate(iso, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(",", "");
}

export interface PanelViewContext {
  locations?: LocationDTO[];
  revisions?: RevisionDTO[];
  componentCount?: number;
  users?: UserNameMap;
}

/**
 * Map a PanelOut → the Panel view-model. Extra context resolves derived fields.
 *
 * `rev`/`revCount`/`comps` are only meaningful when the caller supplies the
 * `revisions`/`componentCount` context (panel detail). In list/dashboard views
 * those aren't cheaply available (would be N+1), so they stay undefined and the
 * UI renders a neutral placeholder rather than a misleading "—"/"0".
 */
export function panelToView(dto: PanelDTO, ctx: PanelViewContext = {}): Panel {
  const loc = ctx.locations?.find((l) => l.id === dto.location_id);
  const hasRevCtx = ctx.revisions !== undefined;
  const revs = ctx.revisions ?? [];
  const active = dto.active_revision_id
    ? revs.find((r) => r.id === dto.active_revision_id)
    : revs.find((r) => r.status === "approved");
  const lastBy = resolveActor(revs[0]?.created_by, ctx.users);
  return {
    id: dto.id,
    company_id: "",
    location_id: dto.location_id ?? "",
    tag: dto.tag,
    serial: dto.serial,
    qr_token: dto.qr_token,
    name: dto.name,
    customer: dto.customer ?? "—",
    loc: loc?.name ?? "—",
    area: dto.area ?? "—",
    volt: dto.voltage ?? "—",
    amp: dto.current_a ?? "—",
    phase: dto.phase ?? "—",
    mfr: dto.mfr ?? "—",
    enclosure: dto.enclosure ?? "—",
    rev: hasRevCtx ? (active?.revision_letter ?? "—") : undefined,
    revCount: hasRevCtx ? revs.length : undefined,
    status: asPanelStatus(dto.status),
    comps: ctx.componentCount,
    install: formatDate(dto.created_at),
    updated: fmtDateTime(dto.updated_at),
    by: lastBy,
    issues: dto.status === "fault" ? 1 : dto.status === "warn" ? 1 : 0,
    scanned: fmtDateTime(dto.updated_at),
    active_revision_id: dto.active_revision_id ?? null,
  };
}

export function revisionToView(
  dto: RevisionDTO,
  fileCount = 0,
  users?: UserNameMap,
): Revision {
  return {
    id: dto.id,
    rev: dto.revision_letter,
    date: formatDate(dto.created_at),
    by: resolveActor(dto.created_by, users),
    status: asRevStatus(dto.status),
    note: dto.change_summary ?? "",
    files: fileCount,
    approver: resolveActor(dto.approved_by, users),
  };
}

/** Map a queue RevisionOut → the RevisionRequest view-model. */
export function revisionRequestToView(
  dto: RevisionDTO,
  panels?: PanelDTO[],
  users?: UserNameMap,
): RevisionRequest {
  const panel = panels?.find((p) => p.id === dto.panel_id);
  const status: "draft" | "review" = dto.status === "review" ? "review" : "draft";
  const prevLetter =
    dto.revision_letter && dto.revision_letter.length === 1
      ? String.fromCharCode(Math.max(64, dto.revision_letter.charCodeAt(0) - 1))
      : "—";
  return {
    id: dto.id,
    panel: panel?.name ?? "—",
    tag: panel?.tag ?? "—",
    rev: dto.revision_letter,
    from: prevLetter === "@" ? "—" : prevLetter,
    by: resolveActor(dto.created_by, users),
    date: formatDate(dto.created_at),
    status,
    note: dto.change_summary ?? "",
    sheets: 0,
  };
}

export function componentToView(dto: ComponentDTO): Component {
  return {
    slot: dto.slot,
    ref: dto.ref,
    desc: dto.description,
    part: dto.part_number ?? "—",
    rating: dto.rating ?? "—",
    type: dto.type ?? "—",
    status: dto.status === "warn" ? "warn" : "ok",
  };
}

export function sheetToView(dto: SheetDTO): Sheet {
  return {
    n: String(dto.sheet_number ?? "").padStart(3, "0"),
    title: dto.sheet_title ?? "Untitled",
  };
}

export function locationToView(dto: LocationDTO): Location {
  return {
    id: dto.id,
    company_id: "",
    code: dto.code,
    name: dto.name,
    region: dto.region ?? undefined,
    sub: dto.region ?? undefined,
  };
}

const MEMBER_STATUSES: MemberStatus[] = ["active", "invited", "suspended"];

function asMemberStatus(s: string): MemberStatus {
  return (MEMBER_STATUSES as string[]).includes(s) ? (s as MemberStatus) : "active";
}

function initialsOf(name: string, email: string): string {
  return (name || email || "?")
    .split(/\s+/)
    .map((w: string) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Map a MemberOut → the Member view-model. */
export function userToView(dto: MemberDTO): Member {
  const status = asMemberStatus(dto.status);
  return {
    id: dto.id,
    membershipId: dto.membership_id,
    userId: dto.user_id,
    email: dto.email,
    name: dto.name || dto.email,
    initials: initialsOf(dto.name, dto.email),
    avatarUrl: dto.avatar_url,
    role: dto.role,
    status,
    lastActive:
      status === "invited"
        ? "Invite pending"
        : status === "suspended"
          ? "Suspended"
          : relativeTime(dto.last_active_at),
    locations: (dto.assigned_locations ?? []).map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
    })),
    invitedAt: dto.invited_at,
    acceptedAt: dto.accepted_at,
  };
}

export function roleToView(dto: RoleDTO): RoleView {
  return {
    role: dto.role as Role,
    label: dto.label,
    permissions: dto.permissions.map((p) => ({
      key: p.key,
      label: p.label,
      description: p.description,
    })),
    memberCount: dto.member_count,
  };
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  "user.invited": "invited a member",
  "user.removed": "removed a member",
  "user.role_changed": "changed a role",
  "user.suspended": "suspended a member",
  "user.activated": "reactivated a member",
  "user.invite_resent": "resent an invitation",
  "user.locations_assigned": "updated location access",
};

function humanizeAction(action: string): string {
  if (AUDIT_ACTION_LABELS[action]) return AUDIT_ACTION_LABELS[action]!;
  // strip a "domain." prefix then de-snake the rest
  return action.replace(/^[^.]+\./, "").replace(/_/g, " ");
}

export function auditToView(dto: AuditLogDTO): AuditEntry {
  return {
    id: dto.id,
    action: dto.action,
    actionLabel: humanizeAction(dto.action),
    actor: dto.actor_name || dto.actor_email || "System",
    actorEmail: dto.actor_email,
    targetType: dto.target_type,
    targetId: dto.target_id,
    meta: (dto.meta ?? {}) as Record<string, unknown>,
    time: relativeTime(dto.created_at),
  };
}

/** Map a panel-scan activity record → ActivityItem. */
export function activityToView(scan: Record<string, string>): ActivityItem {
  const who = scan.user_name ?? scan.user ?? "Someone";
  const wi = who
    .split(/\s+/)
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    who,
    wi,
    act: "scanned QR label for",
    target: scan.tag ?? scan.panel_tag ?? "panel",
    sub: scan.device ?? scan.ip ?? "Field scan",
    time: fmtDateTime(scan.at ?? scan.created_at),
    tone: "accent",
    icon: "scan-line",
  };
}

export function searchHitToView(hit: SearchHitDTO): {
  type: "panel" | "nav";
  id: string;
  label: string;
  sub?: string;
} {
  return {
    type: hit.type === "panel" ? "panel" : "nav",
    id: hit.id,
    label: hit.tag ?? hit.name ?? hit.id,
    sub: hit.name ?? hit.serial,
  };
}
