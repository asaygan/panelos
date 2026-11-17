import type { Issue, Severity } from "@/data/types";

export const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export const SEVERITY_DOT: Record<Severity, string> = {
  low: "bg-subtle",
  medium: "bg-warning",
  high: "bg-danger",
  critical: "bg-danger",
};

const RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Open or in progress: the issue still needs someone's attention. */
export const isActive = (i: Pick<Issue, "status">) =>
  i.status === "open" || i.status === "in_progress";

/** Active issues first (most severe, then newest); finished ones by recency. */
export function sortIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => {
    const aa = isActive(a);
    const bb = isActive(b);
    if (aa !== bb) return aa ? -1 : 1;
    if (aa && RANK[a.severity] !== RANK[b.severity]) return RANK[a.severity] - RANK[b.severity];
    return b.created_at.localeCompare(a.created_at);
  });
}
