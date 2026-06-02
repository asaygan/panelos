/** Panel **lifecycle** status (not operational/SCADA).
 *
 * Tracks where a panel sits in its asset lifecycle from design through retirement.
 * Free transitions between values; every change is audited + recorded in the
 * panel_status_history table so a timeline can be rendered on demand.
 */
export type PanelStatus =
  | "draft"
  | "engineering"
  | "released"
  | "installed"
  | "commissioned"
  | "in_service"
  | "archived";

export type RevisionStatus = "draft" | "review" | "approved" | "superseded" | "rejected";

export const PANEL_STATUS_ORDER: PanelStatus[] = [
  "draft",
  "engineering",
  "released",
  "installed",
  "commissioned",
  "in_service",
  "archived",
];

/** Label + badge class + dot class. CSS classes are reused from the existing
 * palette so the visual tokens stay consistent: each lifecycle stage maps to
 * one of the established tones. */
export const STATUS_META: Record<PanelStatus, { label: string; cls: string; dot: string }> = {
  draft: { label: "Draft", cls: "badge-draft", dot: "dot-draft" },
  engineering: { label: "Engineering", cls: "badge-warn", dot: "dot-warn" },
  released: { label: "Released", cls: "badge-ok", dot: "dot-ok" },
  installed: { label: "Installed", cls: "badge-ok", dot: "dot-ok" },
  commissioned: { label: "Commissioned", cls: "badge-ok", dot: "dot-ok" },
  in_service: { label: "In service", cls: "badge-ok", dot: "dot-ok" },
  archived: { label: "Archived", cls: "badge-idle", dot: "dot-idle" },
};

export const REV_STATUS_META: Record<
  RevisionStatus,
  { tone: "ok" | "idle" | "draft" | "warn" | "fault"; label: string }
> = {
  approved: { tone: "ok", label: "Approved" },
  superseded: { tone: "idle", label: "Superseded" },
  draft: { tone: "draft", label: "Draft" },
  review: { tone: "warn", label: "In review" },
  rejected: { tone: "fault", label: "Rejected" },
};
