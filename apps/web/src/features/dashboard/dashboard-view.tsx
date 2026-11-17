"use client";

import * as React from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  FileCheck2,
  MapPin,
  PanelsTopLeft,
  Plus,
  QrCode as QrIcon,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Can } from "@/components/app/can";
import { DueBadge, SeverityBadge } from "@/components/domain/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Page, PageHeader, Sparkline, StatCard } from "@/components/ui/page";
import { useCompany, useDashboard, useMe, usePermissions } from "@/data/hooks";
import type { Dashboard, Severity } from "@/data/types";
import { ReportIssueDialog } from "@/features/issues/report-issue-dialog";
import { LogMaintenanceDialog } from "@/features/maintenance/log-maintenance-dialog";
import { useFmt } from "@/lib/format";

type Attention = Dashboard["attention"][number];

function attentionHref(item: Attention): string {
  switch (item.kind) {
    case "issue":
      return item.ref_id ? `/issues/${item.ref_id}` : `/panels/${item.panel_id}?tab=issues`;
    case "maintenance_overdue":
      return `/panels/${item.panel_id}?tab=maintenance`;
    case "review":
      return `/panels/${item.panel_id}?tab=revisions`;
    default:
      return `/panels/${item.panel_id}`;
  }
}

export function DashboardView() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const fmt = useFmt();
  const { data: me } = useMe();
  const { data: company } = useCompany();
  const { can } = usePermissions();
  const { data, isLoading, isError, refetch } = useDashboard();
  const [issueOpen, setIssueOpen] = React.useState(false);
  const [maintOpen, setMaintOpen] = React.useState(false);

  if (isLoading) {
    return (
      <Page>
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </Page>
    );
  }

  if (isError || !data) {
    return (
      <Page>
        <ErrorState
          title={tCommon("states.errorTitle")}
          description={tCommon("states.errorHint")}
          action={<Button onClick={() => refetch()}>{tCommon("actions.retry")}</Button>}
        />
      </Page>
    );
  }

  const firstName = (me?.name ?? "").split(" ")[0] ?? "";
  const empty = data.counts.panels === 0 && data.counts.projects === 0;

  return (
    <Page>
      <PageHeader
        title={firstName ? t("greeting", { name: firstName }) : t("title")}
        description={company ? t("subtitle", { company: company.name }) : undefined}
        actions={
          <>
            <Can perm="report_issue">
              <Button onClick={() => setIssueOpen(true)}>
                <TriangleAlert />
                {t("quick.reportIssue")}
              </Button>
            </Can>
            <Can perm="manage_maintenance">
              <Button onClick={() => setMaintOpen(true)}>
                <Wrench />
                {t("quick.logMaintenance")}
              </Button>
            </Can>
            <Can perm="crud_panels">
              <Button asChild variant="primary">
                <Link href="/panels">
                  <Plus />
                  {t("quick.newPanel")}
                </Link>
              </Button>
            </Can>
          </>
        }
      />

      {empty ? (
        <Card>
          <EmptyState
            icon={<PanelsTopLeft />}
            title={t("onboarding.title")}
            description={t("onboarding.body")}
            action={
              can("crud_panels") ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild variant="primary">
                    <Link href="/panels">{t("onboarding.createProject")}</Link>
                  </Button>
                  {can("export_data") && (
                    <Button asChild>
                      <Link href="/panels?import=1">{t("onboarding.importPanels")}</Link>
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <StatLink href="/panels">
              <StatCard
                label={t("stats.panels")}
                value={fmt.number(data.counts.panels)}
                icon={<PanelsTopLeft />}
                hint={t("stats.panelsHint", {
                  projects: data.counts.projects ?? 0,
                  cabinets: data.counts.cabinets ?? 0,
                })}
              />
            </StatLink>
            <StatLink href="/panels?view=table">
              <StatCard
                label={t("stats.documented")}
                value={fmt.number(data.documentation.approved)}
                icon={<FileCheck2 />}
                tone={(data.documentation.missing ?? 0) > 0 ? "warning" : "success"}
                hint={t("stats.documentedHint", { missing: data.documentation.missing ?? 0 })}
              />
            </StatLink>
            <StatLink href="/issues">
              <StatCard
                label={t("stats.openIssues")}
                value={fmt.number(data.issues.open)}
                icon={<TriangleAlert />}
                tone={
                  (data.issues.critical ?? 0) > 0
                    ? "danger"
                    : (data.issues.open ?? 0) > 0
                      ? "warning"
                      : "success"
                }
                hint={t("stats.openIssuesHint", {
                  critical: data.issues.critical ?? 0,
                  resolved: data.issues.resolved_30d ?? 0,
                })}
              >
                <Sparkline
                  data={data.issue_series.map((d) => d.count)}
                  aria-label={t("stats.issueTrend")}
                  className="text-danger"
                />
              </StatCard>
            </StatLink>
            <StatLink href="/maintenance">
              <StatCard
                label={t("stats.overdue")}
                value={fmt.number(data.maintenance.overdue)}
                icon={<Wrench />}
                tone={(data.maintenance.overdue ?? 0) > 0 ? "danger" : "success"}
                hint={t("stats.overdueHint", {
                  soon: data.maintenance.due_soon ?? 0,
                  done: data.maintenance.done_30d ?? 0,
                })}
              />
            </StatLink>
            <StatLink href="/revisions">
              <StatCard
                label={t("stats.review")}
                value={fmt.number(data.revisions.review)}
                icon={<ClipboardCheck />}
                tone={(data.revisions.review ?? 0) > 0 ? "primary" : "neutral"}
                hint={t("stats.reviewHint", {
                  drafts: data.revisions.draft ?? 0,
                  approved: data.revisions.approved_30d ?? 0,
                })}
              />
            </StatLink>
            <StatCard
              label={t("stats.scans")}
              value={fmt.number(data.scans.last_7d)}
              icon={<QrIcon />}
              hint={t("stats.scansHint", {
                today: data.scans.today ?? 0,
                month: data.scans.last_30d ?? 0,
              })}
            >
              <Sparkline
                data={data.scan_series.map((d) => d.count)}
                aria-label={t("stats.scanTrend")}
              />
            </StatCard>
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title={t("attention.title")} description={t("attention.description")} />
              {data.attention.length === 0 ? (
                <EmptyState
                  icon={<FileCheck2 />}
                  title={t("attention.emptyTitle")}
                  description={t("attention.emptyBody")}
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.attention.map((item, i) => (
                    <li key={`${item.kind}-${item.ref_id ?? item.panel_id}-${i}`}>
                      <Link
                        href={attentionHref(item)}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-mono text-sm font-medium">{item.tag}</span>
                            <span className="truncate text-base text-muted">{item.name}</span>
                          </div>
                          <div className="mt-0.5 truncate text-sm text-muted">
                            <span className="text-subtle">
                              {t(`attention.kinds.${item.kind as "issue"}`)}
                            </span>
                            {item.title ? ` · ${item.title}` : ""}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {item.kind === "issue" && item.severity && (
                            <SeverityBadge severity={item.severity as Severity} />
                          )}
                          {item.kind === "maintenance_overdue" && <DueBadge dueOn={item.due_on} />}
                          {item.kind === "review" && (
                            <Badge tone="info">{t("attention.kinds.review")}</Badge>
                          )}
                          {item.at && (
                            <span className="text-xs text-subtle">{fmt.relative(item.at)}</span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title={t("locations.title")} />
              {data.by_location.length === 0 ? (
                <CardBody className="text-sm text-muted">{t("locations.empty")}</CardBody>
              ) : (
                <ul className="divide-y divide-border">
                  {data.by_location.map((loc) => {
                    const share = data.counts.panels
                      ? Math.round((loc.panels / data.counts.panels) * 100)
                      : 0;
                    return (
                      <li key={loc.location_id ?? "none"} className="px-4 py-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-1.5 text-base">
                            <MapPin className="size-3.5 shrink-0 text-subtle" aria-hidden />
                            <span className="truncate">{loc.name ?? t("locations.unassigned")}</span>
                          </span>
                          <span className="shrink-0 text-sm text-muted">
                            {t("locations.panelCount", { count: loc.panels })}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
                          {/* Dynamic width: share of the fleet at this location. */}
                          <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                        </div>
                        {loc.open_issues > 0 && (
                          <div className="mt-1.5 text-xs text-danger">
                            {t("locations.issueCount", { count: loc.open_issues })}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader
              title={t("activity.title")}
              actions={
                can("view_audit") ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/users?tab=audit">{t("activity.viewAll")}</Link>
                  </Button>
                ) : undefined
              }
            />
            {data.recent_activity.length === 0 ? (
              <CardBody className="text-sm text-muted">{t("activity.empty")}</CardBody>
            ) : (
              <ul className="divide-y divide-border">
                {data.recent_activity.map((a) => {
                  // Action names are dotted ("panel.created") and stored nested in the catalog.
                  const key = `activity.actions.${a.action}` as "activity.actions.panel.created";
                  const actor = a.actor_name ?? tCommon("states.system");
                  return (
                    <li key={a.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5">
                      <span className="min-w-0 truncate text-base">
                        {t.has(key) ? t(key, { actor }) : `${actor} · ${a.action}`}
                      </span>
                      <span className="shrink-0 text-xs text-subtle">{fmt.relative(a.at)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      <ReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} />
      <LogMaintenanceDialog open={maintOpen} onOpenChange={setMaintOpen} />
    </Page>
  );
}

function StatLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-lg transition-shadow hover:shadow [&>div]:h-full">
      {children}
    </Link>
  );
}
