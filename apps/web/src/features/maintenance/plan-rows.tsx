"use client";

import Link from "next/link";
import { CalendarClock, ClipboardCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { DueBadge } from "@/components/domain/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MaintenancePlan } from "@/data/types";
import { useFmt } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

/**
 * One maintenance plan as a responsive row. `showPanel` adds the panel link
 * (company-wide page); `actions` is the per-row control area (permission-gated
 * by the caller).
 */
export function PlanRow({
  plan,
  showPanel,
  onRecord,
  menu,
}: {
  plan: MaintenancePlan;
  showPanel?: boolean;
  /** When given, shows the primary "Bakımı kaydet" button. */
  onRecord?: (plan: MaintenancePlan) => void;
  /** Extra controls (e.g. a "more" menu). */
  menu?: React.ReactNode;
}) {
  const t = useTranslations("maintenance");
  const tc = useTranslations("common");
  const fmt = useFmt();
  const overdue = plan.active && (plan.days_until_due ?? 0) < 0;

  return (
    <li
      className={cn(
        "flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center",
        overdue && "bg-danger-soft/40",
        !plan.active && "opacity-70",
      )}
    >
      <div className="min-w-0 flex-1">
        {showPanel && (
          <Link
            href={`/panels/${plan.panel_id}?tab=maintenance`}
            className="block truncate text-sm text-primary hover:underline"
          >
            <span className="font-mono text-xs">{plan.panel_tag}</span>
            {plan.panel_name && <span> · {plan.panel_name}</span>}
          </Link>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-medium [overflow-wrap:anywhere]">{plan.title}</span>
          {!plan.active && <Badge tone="outline">{t("inactive")}</Badge>}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <ClipboardCheck className="size-3.5" aria-hidden />
            {tc(`maintenanceKind.${plan.kind}`)}
          </span>
          <span>{t("interval", { count: plan.interval_days })}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" aria-hidden />
            {fmt.date(plan.next_due_on)}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {plan.active && <DueBadge dueOn={plan.next_due_on} />}
        {onRecord && plan.active && (
          <Button size="sm" variant={overdue ? "primary" : "secondary"} onClick={() => onRecord(plan)}>
            {t("plan.record")}
          </Button>
        )}
        {menu}
      </div>
    </li>
  );
}
