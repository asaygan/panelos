"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { PanelPicker } from "@/components/domain/panel-picker";
import { PhotoUploader } from "@/components/domain/uploads";
import { useIssueMutations } from "@/data/hooks";
import { useApiError } from "@/lib/use-api-error";
import { ChoiceChips } from "./choice-chips";
import { SEVERITIES, SEVERITY_DOT } from "./issue-utils";
import { useDiscardGuard } from "./use-discard-guard";

export interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId?: string;
}

/** Report an issue. Without `panelId` the dialog starts with a panel picker. */
export function ReportIssueDialog({ open, onOpenChange, panelId }: ReportIssueDialogProps) {
  const { dirtyRef, guarded } = useDiscardGuard(onOpenChange);
  return (
    <Dialog open={open} onOpenChange={guarded}>
      {open && <ReportIssueContent panelId={panelId} onClose={() => onOpenChange(false)} dirtyRef={dirtyRef} />}
    </Dialog>
  );
}

const FORM_ID = "report-issue-form";

function ReportIssueContent({
  panelId,
  onClose,
  dirtyRef,
}: {
  panelId?: string;
  onClose: () => void;
  dirtyRef: React.MutableRefObject<boolean>;
}) {
  const t = useTranslations("issues.reportDialog");
  const tc = useTranslations("common");
  const ts = useTranslations("issues.severityHint");
  const router = useRouter();
  const errorText = useApiError();
  const { create } = useIssueMutations();
  const [fileIds, setFileIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);

  const schema = React.useMemo(
    () =>
      z.object({
        panelId: panelId ? z.string() : z.string().min(1, t("panelRequired")),
        title: z.string().trim().min(3, t("titleError")).max(200, t("titleError")),
        severity: z.enum(["low", "medium", "high", "critical"]),
        description: z.string().max(5000),
      }),
    [panelId, t],
  );
  type Values = z.infer<typeof schema>;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { panelId: panelId ?? "", title: "", severity: "medium", description: "" },
  });

  dirtyRef.current = isDirty || fileIds.length > 0;

  const submit = handleSubmit((v) => {
    create.mutate(
      {
        panelId: panelId ?? v.panelId,
        body: {
          title: v.title.trim(),
          severity: v.severity,
          description: v.description.trim() || null,
          file_ids: fileIds,
        },
      },
      {
        onSuccess: (issue) => {
          dirtyRef.current = false;
          toast.success(t("created", { number: issue.number }), {
            action: { label: t("open"), onClick: () => router.push(`/issues/${issue.id}`) },
          });
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
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            loading={create.isPending}
            disabled={busy}
          >
            {busy ? t("uploading") : t("submit")}
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
                <PanelPicker value={field.value} onChange={(id) => field.onChange(id)} />
              </Field>
            )}
          />
        )}
        <Field label={t("titleLabel")} required error={errors.title?.message}>
          <Input {...register("title")} placeholder={t("titlePlaceholder")} maxLength={200} autoFocus={!!panelId} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("severity")}</span>
          <Controller
            control={control}
            name="severity"
            render={({ field }) => (
              <ChoiceChips
                aria-label={t("severity")}
                value={field.value}
                onChange={field.onChange}
                options={SEVERITIES.map((s) => ({
                  value: s,
                  label: tc(`severity.${s}`),
                  hint: ts(s),
                  dot: SEVERITY_DOT[s],
                }))}
              />
            )}
          />
        </div>
        <Field label={t("descriptionLabel")}>
          <Textarea {...register("description")} rows={3} placeholder={t("descriptionPlaceholder")} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("photos")}</span>
          <PhotoUploader onChange={setFileIds} onBusyChange={setBusy} />
        </div>
      </form>
    </DialogContent>
  );
}
