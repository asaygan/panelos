"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, CalendarX2, ClipboardList, ClipboardCheck, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Page, PageHeader, StatCard } from "@/components/ui/page";
import { useMaintenancePlans, usePermissions, useRecentMaintenance } from "@/data/hooks";
import { ExportMenu } from "@/features/issues/export-menu";
import { useFmt } from "@/lib/format";
import { LogMaintenanceDialog } from "./log-maintenance-dialog";
import { PlanRow } from "./plan-rows";
import { RecordRow } from "./record-rows";

type Tab = "due" | "plans" | "recent";
const TABS: Tab[] = ["due", "plans", "recent"];

export function MaintenanceView() {
  const t = useTranslations("maintenance");
  const tc = useTranslations("common");
  const fmt = useFmt();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { can } = usePermissions();
  const manage = can("manage_maintenance");
  const [log, setLog] = React.useState<{ open: boolean; planId?: string; panelId?: string }>({ open: false });

  const raw = params.get("tab");
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "due";
  const setTab = (next: string) => {
    const qs = new URLSearchParams(params.toString());
    if (next === "due") qs.delete("tab");
    else qs.set("tab", next);
    const s = qs.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const dueQ = useMaintenancePlans({ due: "soon" });
  const allQ = useMaintenancePlans();
  const recentQ = useRecentMaintenance(100);

  const duePlans = [...(dueQ.data ?? [])].sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  const overdue = duePlans.filter((p) => (p.days_until_due ?? 0) < 0).length;
  const week = duePlans.filter((p) => (p.days_until_due ?? 0) >= 0 && (p.days_until_due ?? 0) <= 7).length;
  const allPlans = [...(allQ.data ?? [])].sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));

  const openLog = (planId?: string, panelId?: string) => setLog({ open: true, planId, panelId });
  const logButton = manage ? (
    <Button variant="primary" onClick={() => openLog()}>
      <Wrench />
      {t("log")}
    </Button>
  ) : undefined;

  const failure = (refetch: () => unknown) => (
    <ErrorState
      title={t("errorTitle")}
      description={tc("states.errorHint")}
      action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
    />
  );

  const planList = (plans: typeof allPlans) => (
    <ul className="divide-y divide-border">
      {plans.map((p) => (
        <PlanRow
          key={p.id}
          plan={p}
          showPanel
          onRecord={manage ? (plan) => openLog(plan.id, plan.panel_id) : undefined}
        />
      ))}
    </ul>
  );

  return (
    <Page>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            {can("export_data") && <ExportMenu dataset="maintenance" />}
            {logButton}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("summary.overdue")}
          value={dueQ.data ? fmt.number(overdue) : "…"}
          icon={<CalendarX2 />}
          tone={overdue > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label={t("summary.soon")}
          value={dueQ.data ? fmt.number(week) : "…"}
          icon={<CalendarCheck />}
          tone={week > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label={t("summary.active")}
          value={allQ.data ? fmt.number(allPlans.length) : "…"}
          icon={<ClipboardList />}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="due" count={duePlans.length}>
            {t("tabs.due")}
          </TabsTrigger>
          <TabsTrigger value="plans">{t("tabs.plans")}</TabsTrigger>
          <TabsTrigger value="recent">{t("tabs.recent")}</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <TabsContent value="due">
            {dueQ.isLoading ? (
              <SkeletonRows rows={4} />
            ) : dueQ.isError ? (
              failure(dueQ.refetch)
            ) : duePlans.length === 0 ? (
              <EmptyState
                icon={<CalendarCheck />}
                title={t("empty.dueTitle")}
                description={t("empty.dueHint")}
                action={logButton}
              />
            ) : (
              planList(duePlans)
            )}
          </TabsContent>
          <TabsContent value="plans">
            {allQ.isLoading ? (
              <SkeletonRows rows={4} />
            ) : allQ.isError ? (
              failure(allQ.refetch)
            ) : allPlans.length === 0 ? (
              <EmptyState icon={<ClipboardList />} title={t("empty.plansTitle")} description={t("empty.plansHint")} />
            ) : (
              planList(allPlans)
            )}
          </TabsContent>
          <TabsContent value="recent">
            {recentQ.isLoading ? (
              <SkeletonRows rows={4} />
            ) : recentQ.isError ? (
              failure(recentQ.refetch)
            ) : (recentQ.data ?? []).length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck />}
                title={t("empty.recentTitle")}
                description={t("empty.recentHint")}
                action={logButton}
              />
            ) : (
              <ul className="divide-y divide-border">
                {(recentQ.data ?? []).map((r) => (
                  <RecordRow key={r.id} record={r} showPanel />
                ))}
              </ul>
            )}
          </TabsContent>
        </Card>
      </Tabs>

      <LogMaintenanceDialog
        open={log.open}
        onOpenChange={(open) => setLog((s) => ({ ...s, open }))}
        panelId={log.panelId}
        planId={log.planId}
      />
    </Page>
  );
}
