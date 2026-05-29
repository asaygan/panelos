export type PanelStatus = "ok" | "warn" | "fault" | "idle";
export type RevisionStatus = "draft" | "review" | "approved" | "superseded" | "rejected";

export const STATUS_META: Record<PanelStatus, { label: string; cls: string; dot: string }> = {
  ok: { label: "Energized", cls: "badge-ok", dot: "dot-ok" },
  warn: { label: "Attention", cls: "badge-warn", dot: "dot-warn" },
  fault: { label: "Fault", cls: "badge-fault", dot: "dot-fault" },
  idle: { label: "Offline", cls: "badge-idle", dot: "dot-idle" },
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
