"use client";

import * as React from "react";
import { CalendarClock, FileCheck2, FileClock, ScanLine, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DueBadge, RevisionStatusBadge, SeverityBadge } from "@/components/domain/badges";
import { useFmt } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import type { Panel, RevisionStatus, Severity } from "@/data/types";
import type { PanelTab } from "./tabs";

function Glance({
  icon,
  label,
  tone,
  children,
  action,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "warning" | "danger";
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-surface p-4 shadow-sm",
        tone === "warning" ? "border-warning/40" : tone === "danger" ? "border-danger/30" : "border-border",
        className,
      )}
    >
      <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted [&_svg]:size-4 [&_svg]:text-subtle">
        {icon}
        {label}
      </h3>
      <div className="flex flex-1 flex-col gap-1.5">{children}</div>
      {action}
    </section>
  );
}

export function GlanceCards({ panel, onTab }: { panel: Panel; onTab: (tab: PanelTab) => void }) {
  const t = useTranslations("panelDetail.glance");
  const fmt = useFmt();
  const live = panel.active_revision;
  const pending = panel.pending_revision;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Glance
        icon={<FileCheck2 />}
        label={t("schematic")}
        tone={live ? undefined : "warning"}
        className="sm:col-span-2 xl:col-span-1"
        action={
          <Button
            variant={live ? "primary" : "secondary"}
            size="md"
            className="w-full"
            onClick={() => onTab("schematics")}
          >
            {live ? t("openSchematic") : t("goSchematics")}
          </Button>
        }
      >
        {live ? (
          <>
            <div className="text-2xl font-semibold">{t("schematicRev", { letter: live.letter })}</div>
            <div>
              <RevisionStatusBadge status={live.status as RevisionStatus} />
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-semibold">{t("noSchematic")}</div>
            <p className="text-sm text-muted">{t("noSchematicHint")}</p>
          </>
        )}
      </Glance>

      <Glance
        icon={<FileClock />}
        label={t("pending")}
        action={
          pending ? (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => onTab("revisions")}>
              {t("viewRevisions")}
            </Button>
          ) : undefined
        }
      >
        {pending ? (
          <>
            <div className="text-2xl font-semibold">{t("schematicRev", { letter: pending.letter })}</div>
            <div>
              <RevisionStatusBadge status={pending.status as RevisionStatus} />
            </div>
          </>
        ) : (
          <p className="text-base text-muted">{t("noPending")}</p>
        )}
      </Glance>

      <Glance
        icon={<TriangleAlert />}
        label={t("issues")}
        tone={panel.open_issue_count > 0 ? "danger" : undefined}
        action={
          panel.open_issue_count > 0 ? (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => onTab("issues")}>
              {t("viewIssues")}
            </Button>
          ) : undefined
        }
      >
        {panel.open_issue_count > 0 ? (
          <>
            <div className="font-tabular text-2xl font-semibold">{panel.open_issue_count}</div>
            {panel.worst_open_severity && (
              <div>
                <SeverityBadge severity={panel.worst_open_severity as Severity} />
              </div>
            )}
          </>
        ) : (
          <p className="text-base text-muted">{t("noIssues")}</p>
        )}
      </Glance>

      <Glance
        icon={<CalendarClock />}
        label={t("nextMaintenance")}
        tone={panel.maintenance_overdue ? "danger" : undefined}
        action={
          <Button variant="ghost" size="sm" className="self-start" onClick={() => onTab("maintenance")}>
            {t("viewMaintenance")}
          </Button>
        }
      >
        {panel.next_maintenance_on ? (
          <>
            <div className="text-lg font-semibold">{fmt.date(panel.next_maintenance_on)}</div>
            <div>
              <DueBadge dueOn={panel.next_maintenance_on} />
            </div>
          </>
        ) : (
          <p className="text-base text-muted">{t("noMaintenance")}</p>
        )}
      </Glance>

      <Glance icon={<ScanLine />} label={t("lastScan")}>
        {panel.last_scan_at ? (
          <>
            <div className="text-lg font-semibold">{fmt.relative(panel.last_scan_at)}</div>
            <div className="text-sm text-subtle">{fmt.dateTime(panel.last_scan_at)}</div>
          </>
        ) : (
          <p className="text-base text-muted">{t("neverScanned")}</p>
        )}
      </Glance>
    </div>
  );
}
