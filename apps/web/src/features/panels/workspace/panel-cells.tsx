"use client";

import { AlertTriangle, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const severityTone: Record<string, BadgeTone> = {
  low: "neutral",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

/** Open issue count, colored by the worst open severity. Renders a dash for zero. */
export function IssueCount({
  count,
  severity,
  showZero,
}: {
  count: number;
  severity?: string | null;
  showZero?: boolean;
}) {
  const t = useTranslations("panels.cells");
  const ts = useTranslations("common.severity");
  if (count <= 0) return showZero ? <span className="text-subtle">—</span> : null;
  const sev = severity ?? "low";
  const label = t("issuesAria", { count, severity: ts.has(sev as never) ? ts(sev as never) : sev });
  return (
    <Badge tone={severityTone[sev] ?? "neutral"} aria-label={label} title={label}>
      <AlertTriangle aria-hidden />
      {count}
    </Badge>
  );
}

/** Marker shown when a maintenance plan on the panel is past due. */
export function OverdueMark() {
  const t = useTranslations("panels.cells");
  return (
    <Badge tone="danger" aria-label={t("overdue")} title={t("overdue")}>
      <Wrench aria-hidden />
      <span className="hidden sm:inline">{t("overdue")}</span>
    </Badge>
  );
}
