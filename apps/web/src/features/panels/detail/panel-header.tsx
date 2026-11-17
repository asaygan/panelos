"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight, Clock, MapPin, MoreHorizontal, Pencil, Archive, Tag, TriangleAlert, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { DocStatusBadge } from "@/components/domain/badges";
import { usePermissions } from "@/data/hooks";
import type { Panel } from "@/data/types";
import { useArchivePanel, type PanelDialogKind } from "./panel-actions";
import type { PanelTab } from "./tabs";

function Breadcrumb({ panel }: { panel: Panel }) {
  const t = useTranslations("panelDetail.breadcrumb");
  const crumbs: { href: string; label: string }[] = [{ href: "/panels", label: t("panels") }];
  if (panel.project_id && panel.project_name)
    crumbs.push({ href: `/panels?project=${panel.project_id}`, label: panel.project_name });
  if (panel.system_group_id && panel.group_name)
    crumbs.push({ href: `/panels?group=${panel.system_group_id}`, label: panel.group_name });

  return (
    <nav aria-label={t("label")}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm text-muted">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-subtle" aria-hidden />}
            <Link href={c.href} className="truncate hover:text-foreground hover:underline">
              {c.label}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function AlertChips({ panel, onTab }: { panel: Panel; onTab: (tab: PanelTab) => void }) {
  const t = useTranslations("panelDetail.chips");
  const ts = useTranslations("common.severity");
  if (panel.open_issue_count === 0 && !panel.maintenance_overdue) return null;
  const severe = panel.worst_open_severity === "high" || panel.worst_open_severity === "critical";
  const severity = panel.worst_open_severity as "low" | "medium" | "high" | "critical" | null | undefined;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {panel.open_issue_count > 0 && (
        <button type="button" onClick={() => onTab("issues")} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <Badge tone={severe ? "danger" : "warning"}>
            <AlertTriangle />
            {t("openIssues", { count: panel.open_issue_count })}
            {severity && <span className="font-normal opacity-80">· {ts(severity)}</span>}
          </Badge>
        </button>
      )}
      {panel.maintenance_overdue && (
        <button type="button" onClick={() => onTab("maintenance")} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
          <Badge tone="danger">
            <Clock />
            {t("maintenanceOverdue")}
          </Badge>
        </button>
      )}
    </div>
  );
}

export function PanelHeader({
  panel,
  onTab,
  onAction,
}: {
  panel: Panel;
  onTab: (tab: PanelTab) => void;
  onAction: (kind: PanelDialogKind) => void;
}) {
  const t = useTranslations("panelDetail.actions");
  const tc = useTranslations("common");
  const { can } = usePermissions();
  const archive = useArchivePanel(panel);
  const canIssue = can("report_issue");
  const canMaint = can("manage_maintenance");
  const canLabel = can("generate_labels");
  const canEdit = can("crud_panels");
  const hasMenu = canLabel || canEdit;

  return (
    <header className="flex flex-col gap-3">
      <Breadcrumb panel={panel} />
      <div className="flex items-start justify-between gap-3 max-xl:flex-wrap">
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="whitespace-nowrap font-mono text-2xl font-semibold tracking-tight">{panel.tag}</h1>
            <DocStatusBadge status={panel.doc_status} />
          </div>
          <p className="mt-0.5 truncate text-lg text-muted">{panel.name}</p>
          {panel.location_name && (
            <p className="mt-1 flex items-center gap-1 text-sm text-subtle">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{panel.location_name}</span>
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canIssue && (
            <Button className="hidden sm:inline-flex" onClick={() => onAction("issue")}>
              <TriangleAlert />
              {t("reportIssue")}
            </Button>
          )}
          {canMaint && (
            <Button className="hidden sm:inline-flex" onClick={() => onAction("maintenance")}>
              <Wrench />
              {t("logMaintenance")}
            </Button>
          )}
          {canLabel && (
            <Button className="hidden sm:inline-flex" onClick={() => onAction("label")}>
              <Tag />
              {t("label")}
            </Button>
          )}
          {canEdit && (
            <Button className="hidden sm:inline-flex" onClick={() => onAction("edit")}>
              <Pencil />
              {t("edit")}
            </Button>
          )}
          {hasMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={tc("actions.more")}
                  className={canEdit ? undefined : "sm:hidden"}
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {canLabel && (
                  <DropdownMenuItem className="sm:hidden" onSelect={() => onAction("label")}>
                    <Tag />
                    {t("label")}
                  </DropdownMenuItem>
                )}
                {canEdit && (
                  <>
                    <DropdownMenuItem className="sm:hidden" onSelect={() => onAction("edit")}>
                      <Pencil />
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem destructive onSelect={() => void archive()}>
                      <Archive />
                      {t("archive")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <AlertChips panel={panel} onTab={onTab} />
    </header>
  );
}

/** Sticky field actions for phones, sitting directly above the app's bottom navigation. */
export function PanelActionBar({ onAction }: { onAction: (kind: PanelDialogKind) => void }) {
  const t = useTranslations("panelDetail.actions");
  const { can } = usePermissions();
  const canIssue = can("report_issue");
  const canMaint = can("manage_maintenance");
  if (!canIssue && !canMaint) return null;
  return (
    <div
      role="group"
      aria-label={t("fieldActions")}
      className="flex shrink-0 gap-2 border-t border-border bg-surface px-4 py-2.5 shadow-[0_-4px_12px_rgb(0_0_0/0.06)] sm:hidden"
    >
      {canIssue && (
        <Button variant="primary" size="lg" className="flex-1" onClick={() => onAction("issue")}>
          <TriangleAlert />
          {t("reportIssue")}
        </Button>
      )}
      {canMaint && (
        <Button size="lg" className="flex-1" onClick={() => onAction("maintenance")}>
          <Wrench />
          {t("logMaintenance")}
        </Button>
      )}
    </div>
  );
}
