"use client";

import * as React from "react";
import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { Segmented, Select } from "@/components/ui/controls";
import { usePermissions } from "@/data/hooks";
import type { Panel } from "@/data/types";
import { LabelPreview } from "./label-preview";
import { usePrintLabels } from "./print-sheet";
import { useChoiceSelection, useLabelChoices } from "./use-label-choices";
import { useLabelData } from "./use-label-data";
import { useLabelExport, type ExportFormat } from "./use-label-export";

export interface LabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panel: Panel;
}

/** Preview + export the QR label of one panel. */
export function LabelDialog({ open, onOpenChange, panel }: LabelDialogProps) {
  const t = useTranslations("labels");
  const tc = useTranslations("common");
  const { can } = usePermissions();
  const { choices, defaultChoice, isLoading, isError, refetch } = useLabelChoices();
  const { choice, choiceId, setChoiceId } = useChoiceSelection(choices, defaultChoice);
  const data = useLabelData(panel);
  const { pending, exportOne } = useLabelExport(choice);
  const { print, node } = usePrintLabels();
  const [format, setFormat] = React.useState<ExportFormat>("png");

  const allowed = can("generate_labels");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          title={t("dialog.title")}
          description={`${panel.tag} · ${panel.name}`}
          closeLabel={tc("actions.close")}
          size="lg"
          footer={
            allowed && choice ? (
              <>
                <Button variant="secondary" onClick={() => onOpenChange(false)}>
                  {tc("actions.close")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => print([{ layout: choice.layout, data }])}
                >
                  <Printer />
                  {tc("actions.print")}
                </Button>
                <Button loading={pending !== null} onClick={() => void exportOne(panel, format)}>
                  {pending === null && <Download />}
                  {t("dialog.download", { format: format.toUpperCase() })}
                </Button>
              </>
            ) : undefined
          }
        >
          {!allowed ? (
            <ErrorState
              title={t("noPermission.title")}
              description={t("noPermission.body")}
              action={
                <Button variant="secondary" onClick={() => onOpenChange(false)}>
                  {tc("actions.close")}
                </Button>
              }
            />
          ) : isLoading ? (
            <Skeleton className="h-56 w-full" />
          ) : isError || !choice ? (
            <ErrorState
              title={tc("states.errorTitle")}
              description={tc("states.errorHint")}
              action={
                <Button variant="secondary" onClick={() => void refetch()}>
                  {tc("actions.retry")}
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              <LabelPreview layout={choice.layout} data={data} maxHeightRatio={0.4} />
              <p className="text-center text-xs text-subtle">
                {t("sizeLine", {
                  w: choice.layout.size_mm.w,
                  h: choice.layout.size_mm.h,
                  orientation: t(`orientation.${choice.layout.orientation}`),
                })}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={t("options.template")}
                  hint={
                    <Link
                      href="/settings/label-templates"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {t("options.manageTemplates")}
                    </Link>
                  }
                >
                  <Select
                    value={choiceId}
                    onValueChange={setChoiceId}
                    options={choices.map((c) => ({
                      value: c.id,
                      label: c.isDefault ? `${c.name} (${t("options.defaultMark")})` : c.name,
                    }))}
                  />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">{t("options.fileFormat")}</span>
                  <Segmented<ExportFormat>
                    aria-label={t("options.fileFormat")}
                    value={format}
                    onChange={setFormat}
                    options={[
                      { value: "png", label: "PNG" },
                      { value: "svg", label: "SVG" },
                      { value: "pdf", label: "PDF" },
                    ]}
                    className="self-start"
                  />
                  <p className="text-xs text-subtle">{t(`options.formatHint.${format}`)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {node}
    </>
  );
}
