"use client";

import * as React from "react";
import { CalendarPlus, ChevronDown, ChevronRight, ClipboardCheck, Plus, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { useMaintenancePlans, usePanelMaintenance, usePermissions } from "@/data/hooks";
import type { MaintenancePlan, Panel } from "@/data/types";
import { LogMaintenanceDialog } from "./log-maintenance-dialog";
import { PlanFormDialog } from "./plan-form-dialog";
import { PlanMenu } from "./plan-menu";
import { PlanRow } from "./plan-rows";
import { RecordRow } from "./record-rows";

/** Maintenance plans and history of one panel. */
export function PanelMaintenanceTab({ panel }: { panel: Panel }) {
  const t = useTranslations("maintenance");
  const tc = useTranslations("common");
  const { can } = usePermissions();
  const manage = can("manage_maintenance");
  const plansQ = useMaintenancePlans({ panel_id: panel.id, include_inactive: true });
  const recordsQ = usePanelMaintenance(panel.id);
  const [logOpen, setLogOpen] = React.useState(false);
  const [logPlanId, setLogPlanId] = React.useState<string | undefined>();
  const [planDialog, setPlanDialog] = React.useState<{ open: boolean; plan?: MaintenancePlan }>({ open: false });
  const [showInactive, setShowInactive] = React.useState(false);

  const plans = [...(plansQ.data ?? [])].sort((a, b) => a.next_due_on.localeCompare(b.next_due_on));
  const active = plans.filter((p) => p.active);
  const inactive = plans.filter((p) => !p.active);
  const records = [...(recordsQ.data ?? [])].sort((a, b) => b.performed_at.localeCompare(a.performed_at));

  const openLog = (planId?: string) => {
    setLogPlanId(planId);
    setLogOpen(true);
  };
  const addPlanButton = (
    <Button variant="primary" size="sm" onClick={() => setPlanDialog({ open: true })}>
      <Plus />
      {t("panelTab.addPlan")}
    </Button>
  );
  const retry = (refetch: () => unknown) => (
    <ErrorState
      title={t("errorTitle")}
      description={tc("states.errorHint")}
      action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
    />
  );
  const planRow = (p: MaintenancePlan) => (
    <PlanRow
      key={p.id}
      plan={p}
      onRecord={manage ? (plan) => openLog(plan.id) : undefined}
      menu={manage ? <PlanMenu plan={p} onEdit={(plan) => setPlanDialog({ open: true, plan })} /> : undefined}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title={t("panelTab.plans")}
          description={t("panelTab.plansHint")}
          actions={manage && addPlanButton}
        />
        {plansQ.isLoading ? (
          <SkeletonRows rows={2} />
        ) : plansQ.isError ? (
          retry(plansQ.refetch)
        ) : plans.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus />}
            title={t("panelTab.noPlansTitle")}
            description={t("panelTab.noPlansHint")}
            action={manage ? addPlanButton : undefined}
          />
        ) : (
          <>
            {active.length > 0 && <ul className="divide-y divide-border">{active.map(planRow)}</ul>}
            {inactive.length > 0 && (
              <div className="border-t border-border">
                <button
                  type="button"
                  aria-expanded={showInactive}
                  onClick={() => setShowInactive((v) => !v)}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-muted"
                >
                  {showInactive ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  {t("panelTab.inactivePlans", { count: inactive.length })}
                </button>
                {showInactive && <ul className="divide-y divide-border border-t border-border">{inactive.map(planRow)}</ul>}
              </div>
            )}
          </>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t("panelTab.history")}
          description={t("panelTab.historyHint")}
          actions={
            manage && (
              <Button variant="primary" size="sm" onClick={() => openLog()}>
                <Wrench />
                {t("log")}
              </Button>
            )
          }
        />
        {recordsQ.isLoading ? (
          <SkeletonRows rows={3} />
        ) : recordsQ.isError ? (
          retry(recordsQ.refetch)
        ) : records.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck />}
            title={t("panelTab.noHistoryTitle")}
            description={t("panelTab.noHistoryHint")}
            action={
              manage ? (
                <Button variant="primary" onClick={() => openLog()}>
                  <Wrench />
                  {t("log")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {records.map((r) => (
              <RecordRow key={r.id} record={r} />
            ))}
          </ul>
        )}
      </Card>

      <LogMaintenanceDialog open={logOpen} onOpenChange={setLogOpen} panelId={panel.id} planId={logPlanId} />
      <PlanFormDialog
        open={planDialog.open}
        onOpenChange={(open) => setPlanDialog((s) => ({ ...s, open }))}
        panelId={panel.id}
        plan={planDialog.plan}
      />
    </div>
  );
}
