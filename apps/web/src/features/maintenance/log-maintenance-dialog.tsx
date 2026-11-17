"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { PanelPicker } from "@/components/domain/panel-picker";
import { PhotoUploader } from "@/components/domain/uploads";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Label } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { useMaintenanceMutations, useMaintenancePlans, usePanelIssues } from "@/data/hooks";
import { ChoiceChips } from "@/features/issues/choice-chips";
import { isActive } from "@/features/issues/issue-utils";
import { ReportIssueDialog } from "@/features/issues/report-issue-dialog";
import { useDiscardGuard } from "@/features/issues/use-discard-guard";
import { useApiError } from "@/lib/use-api-error";
import { KINDS, RESULTS, RESULT_DOT, toLocalInput } from "./maintenance-utils";

export interface LogMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId?: string;
  /** Pre-select the plan this work fulfils. */
  planId?: string;
  /** Link (and optionally resolve) an issue. */
  issueId?: string;
}

/** Record maintenance that was carried out. Without `panelId` the dialog starts with a panel picker. */
export function LogMaintenanceDialog(props: LogMaintenanceDialogProps) {
  const { open, onOpenChange } = props;
  const { dirtyRef, guarded } = useDiscardGuard(onOpenChange);
  const [reportFor, setReportFor] = React.useState<string | null>(null);
  return (
    <>
      <Dialog open={open} onOpenChange={guarded}>
        {open && (
          <LogContent
            {...props}
            dirtyRef={dirtyRef}
            onClose={() => onOpenChange(false)}
            onReportIssue={setReportFor}
          />
        )}
      </Dialog>
      <ReportIssueDialog
        open={reportFor !== null}
        onOpenChange={(o) => !o && setReportFor(null)}
        panelId={reportFor ?? undefined}
      />
    </>
  );
}

const FORM_ID = "log-maintenance-form";
const NONE = "none";

function LogContent({
  panelId,
  planId,
  issueId,
  dirtyRef,
  onClose,
  onReportIssue,
}: LogMaintenanceDialogProps & {
  dirtyRef: React.MutableRefObject<boolean>;
  onClose: () => void;
  onReportIssue: (panelId: string) => void;
}) {
  const t = useTranslations("maintenance.dialog");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const { record } = useMaintenanceMutations();
  const [fileIds, setFileIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [nowValue] = React.useState(() => toLocalInput(new Date()));

  const schema = React.useMemo(
    () =>
      z.object({
        panelId: panelId ? z.string() : z.string().min(1, t("panelRequired")),
        kind: z.enum(KINDS),
        result: z.enum(RESULTS),
        summary: z.string().trim().min(1, t("summaryError")).max(1000, t("summaryError")),
        findings: z.string().max(5000),
        performedAt: z.string().min(1),
        performedBy: z.string().max(200),
        planId: z.string(),
        issueId: z.string(),
        resolveIssue: z.boolean(),
      }),
    [panelId, t],
  );
  type Values = z.infer<typeof schema>;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      panelId: panelId ?? "",
      kind: "inspection",
      result: "ok",
      summary: "",
      findings: "",
      performedAt: nowValue,
      performedBy: "",
      planId: planId ?? NONE,
      issueId: issueId ?? NONE,
      resolveIssue: !!issueId,
    },
  });

  const pickedPanel = watch("panelId");
  const effectivePanel = panelId ?? (pickedPanel || undefined);
  const selectedPlan = watch("planId");
  const selectedIssue = watch("issueId");

  const { data: allPlans } = useMaintenancePlans({ panel_id: effectivePanel });
  const { data: allIssues } = usePanelIssues(effectivePanel);
  const plans = React.useMemo(
    () => (effectivePanel ? (allPlans ?? []).filter((p) => p.active) : []),
    [allPlans, effectivePanel],
  );
  const issues = React.useMemo(() => (allIssues ?? []).filter(isActive), [allIssues]);

  // A preselected plan decides the kind as soon as plans are known.
  const appliedPlan = React.useRef(false);
  React.useEffect(() => {
    if (appliedPlan.current || !planId) return;
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setValue("kind", plan.kind);
      appliedPlan.current = true;
    }
  }, [plans, planId, setValue]);

  dirtyRef.current = isDirty || fileIds.length > 0;

  const submit = handleSubmit((v) => {
    const pid = panelId ?? v.panelId;
    const linkedIssue = v.issueId !== NONE ? v.issueId : null;
    record.mutate(
      {
        panelId: pid,
        body: {
          kind: v.kind,
          result: v.result,
          summary: v.summary.trim(),
          findings: v.findings.trim() || null,
          performed_at: new Date(v.performedAt).toISOString(),
          performed_by_name: v.performedBy.trim() || null,
          plan_id: v.planId !== NONE ? v.planId : null,
          issue_id: linkedIssue,
          resolve_issue: !!linkedIssue && v.resolveIssue,
          file_ids: fileIds,
        },
      },
      {
        onSuccess: () => {
          dirtyRef.current = false;
          const offer = v.result !== "ok" && !linkedIssue;
          toast.success(
            t("created"),
            offer
              ? { action: { label: t("reportIssue"), onClick: () => onReportIssue(pid) } }
              : undefined,
          );
          onClose();
        },
        onError: (e) => toast.error(errorText(e)),
      },
    );
  });

  return (
    <DialogContent
      title={t("title")}
      description={t("description")}
      closeLabel={tc("actions.close")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={record.isPending} disabled={busy}>
            {t("submit")}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {!panelId && (
          <Controller
            control={control}
            name="panelId"
            render={({ field }) => (
              <Field label={t("panel")} required error={errors.panelId?.message}>
                <PanelPicker
                  value={field.value}
                  onChange={(id) => {
                    field.onChange(id);
                    setValue("planId", NONE);
                    setValue("issueId", NONE);
                    setValue("resolveIssue", false);
                  }}
                />
              </Field>
            )}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("result")}</span>
          <Controller
            control={control}
            name="result"
            render={({ field }) => (
              <ChoiceChips
                aria-label={t("result")}
                value={field.value}
                onChange={field.onChange}
                options={RESULTS.map((r) => ({
                  value: r,
                  label: tc(`maintenanceResult.${r}`),
                  dot: RESULT_DOT[r],
                }))}
              />
            )}
          />
        </div>

        <Field label={t("summaryLabel")} required error={errors.summary?.message}>
          <Input {...register("summary")} placeholder={t("summaryPlaceholder")} maxLength={1000} />
        </Field>

        <Field label={t("findings")}>
          <Textarea {...register("findings")} rows={3} placeholder={t("findingsPlaceholder")} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <Field label={t("kind")}>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  options={KINDS.map((k) => ({ value: k, label: tc(`maintenanceKind.${k}`) }))}
                />
              </Field>
            )}
          />
          <Field label={t("performedAt")} required>
            <Input type="datetime-local" max={nowValue} {...register("performedAt")} />
          </Field>
        </div>

        <Field label={t("performedBy")} hint={t("performedByHint")}>
          <Input {...register("performedBy")} maxLength={200} autoComplete="off" />
        </Field>

        {effectivePanel && (
          <>
            <Controller
              control={control}
              name="planId"
              render={({ field }) => (
                <Field label={t("plan")} hint={selectedPlan !== NONE ? t("planHint") : undefined}>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      const plan = plans.find((p) => p.id === v);
                      if (plan) setValue("kind", plan.kind);
                    }}
                    options={[
                      { value: NONE, label: t("noPlan") },
                      ...plans.map((p) => ({ value: p.id, label: p.title })),
                    ]}
                  />
                </Field>
              )}
            />
            {(issues.length > 0 || selectedIssue !== NONE) && (
              <div className="flex flex-col gap-2">
                <Controller
                  control={control}
                  name="issueId"
                  render={({ field }) => (
                    <Field label={t("issue")}>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          setValue("resolveIssue", v !== NONE);
                        }}
                        options={[
                          { value: NONE, label: t("noIssue") },
                          ...issues.map((i) => ({ value: i.id, label: `#${i.number} · ${i.title}` })),
                        ]}
                      />
                    </Field>
                  )}
                />
                {selectedIssue !== NONE && (
                  <Controller
                    control={control}
                    name="resolveIssue"
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="resolve-issue"
                          checked={field.value}
                          onCheckedChange={(c) => field.onChange(c === true)}
                        />
                        <Label htmlFor="resolve-issue" className="text-base font-normal">
                          {t("resolveIssue")}
                        </Label>
                      </div>
                    )}
                  />
                )}
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("photos")}</span>
          <PhotoUploader onChange={setFileIds} onBusyChange={setBusy} />
        </div>
      </form>
    </DialogContent>
  );
}
