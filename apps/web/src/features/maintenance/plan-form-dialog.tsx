"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { useMaintenanceMutations } from "@/data/hooks";
import type { MaintenancePlan } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { cn } from "@/lib/utils/cn";
import { addDays, KINDS, toDateInput, type Kind } from "./maintenance-utils";

const PRESETS = [30, 90, 180, 365];

export interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId: string;
  /** Edit this plan; omit to create one. */
  plan?: MaintenancePlan;
}

export function PlanFormDialog({ open, onOpenChange, panelId, plan }: PlanFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PlanFormContent panelId={panelId} plan={plan} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function PlanFormContent({
  panelId,
  plan,
  onClose,
}: {
  panelId: string;
  plan?: MaintenancePlan;
  onClose: () => void;
}) {
  const t = useTranslations("maintenance.planForm");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const { createPlan, updatePlan } = useMaintenanceMutations();
  const initialInterval = plan?.interval_days ?? 365;

  const [title, setTitle] = React.useState(plan?.title ?? "");
  const [kind, setKind] = React.useState<Kind>(plan?.kind ?? "preventive");
  const [interval, setInterval] = React.useState(String(initialInterval));
  const [custom, setCustom] = React.useState(!PRESETS.includes(initialInterval));
  const [due, setDue] = React.useState(
    plan?.next_due_on ?? toDateInput(addDays(new Date(), initialInterval)),
  );
  const [dueTouched, setDueTouched] = React.useState(!!plan);
  const [notes, setNotes] = React.useState(plan?.notes ?? "");
  const [submitted, setSubmitted] = React.useState(false);

  const days = Number(interval);
  const titleOk = title.trim().length >= 3 && title.trim().length <= 200;
  const intervalOk = Number.isInteger(days) && days >= 1 && days <= 3650;
  const dueOk = due.length > 0;
  const pending = createPlan.isPending || updatePlan.isPending;

  const chooseInterval = (value: string) => {
    setInterval(value);
    const n = Number(value);
    if (!dueTouched && Number.isInteger(n) && n >= 1 && n <= 3650) {
      setDue(toDateInput(addDays(new Date(), n)));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!titleOk || !intervalOk || !dueOk) return;
    const opts = {
      onSuccess: () => {
        toast.success(t(plan ? "updated" : "created"));
        onClose();
      },
      onError: (err: unknown) => toast.error(errorText(err)),
    };
    const common = { title: title.trim(), kind, interval_days: days, notes: notes.trim() || null };
    if (plan) updatePlan.mutate({ id: plan.id, body: { ...common, next_due_on: due } }, opts);
    else createPlan.mutate({ panelId, body: { ...common, next_due_on: due } }, opts);
  };

  return (
    <DialogContent
      title={t(plan ? "editTitle" : "addTitle")}
      description={t("description")}
      closeLabel={tc("actions.close")}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {tc("actions.cancel")}
          </Button>
          <Button type="submit" form="plan-form" variant="primary" loading={pending}>
            {tc("actions.save")}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label={t("titleLabel")} required error={submitted && !titleOk ? t("titleError") : null}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} maxLength={200} autoFocus />
        </Field>
        <Field label={t("kind")}>
          <Select
            value={kind}
            onValueChange={(v) => setKind(v as Kind)}
            options={KINDS.map((k) => ({ value: k, label: tc(`maintenanceKind.${k}`) }))}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("interval")}</span>
          <div role="radiogroup" aria-label={t("interval")} className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const selected = !custom && days === p;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setCustom(false);
                    chooseInterval(String(p));
                  }}
                  className={cn(
                    "h-10 rounded-lg border px-3.5 text-base font-medium",
                    selected ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-surface hover:bg-surface-2",
                  )}
                >
                  {t("preset", { days: p })}
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={custom}
              onClick={() => setCustom(true)}
              className={cn(
                "h-10 rounded-lg border px-3.5 text-base font-medium",
                custom ? "border-primary bg-primary-soft text-primary" : "border-border-strong bg-surface hover:bg-surface-2",
              )}
            >
              {t("custom")}
            </button>
          </div>
          {custom && (
            <Field label={t("customDays")} error={submitted && !intervalOk ? t("intervalError") : null}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={3650}
                value={interval}
                onChange={(e) => chooseInterval(e.target.value)}
                className="max-w-40"
              />
            </Field>
          )}
        </div>
        <Field label={t(plan ? "nextDue" : "firstDue")} required error={submitted && !dueOk ? t("dueRequired") : null}>
          <Input
            type="date"
            value={due}
            onChange={(e) => {
              setDue(e.target.value);
              setDueTouched(true);
            }}
          />
        </Field>
        <Field label={t("notes")}>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={5000} placeholder={t("notesPlaceholder")} />
        </Field>
      </form>
    </DialogContent>
  );
}
