"use client";

import Link from "next/link";
import { CheckCircle2, Download, ExternalLink, FileText, Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Segmented, Select } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { sameOriginUrl, sheetCapacity, type LabelChoice } from "./label-utils";
import type { BatchState, ExportFormat } from "./use-label-export";

export interface LabelOptionsProps {
  choices: LabelChoice[];
  choice: LabelChoice;
  onChoice: (id: string) => void;
  format: ExportFormat;
  onFormat: (f: ExportFormat) => void;
  /** Panel shown in the preview (single-label actions). */
  hasFocus: boolean;
  exporting: ExportFormat | null;
  onExportOne: () => void;
  onPrintOne: () => void;
  /** Batch over the selection. */
  selectedCount: number;
  batch: BatchState;
  onExportBatch: () => void;
  onPrintBatch: () => void;
}

/** Right column of the labels page: design choice and every export action. */
export function LabelOptions(p: LabelOptionsProps) {
  const t = useTranslations("labels");
  const tc = useTranslations("common");
  const { perSheet } = sheetCapacity(p.choice.layout);
  const sheets = Math.ceil(p.selectedCount / perSheet);
  const running = p.batch.status === "running";

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title={t("options.title")} />
        <CardBody className="flex flex-col gap-4">
          <Field label={t("options.template")}>
            <Select
              value={p.choice.id}
              onValueChange={p.onChoice}
              options={p.choices.map((c) => ({
                value: c.id,
                label: c.isDefault ? `${c.name} (${t("options.defaultMark")})` : c.name,
              }))}
            />
          </Field>
          <p className="-mt-2 text-xs text-subtle">
            {t("sizeLine", {
              w: p.choice.layout.size_mm.w,
              h: p.choice.layout.size_mm.h,
              orientation: t(`orientation.${p.choice.layout.orientation}`),
            })}
          </p>
          <Link
            href="/settings/label-templates"
            className="-mt-2 self-start text-sm text-primary underline-offset-4 hover:underline"
          >
            {t("options.manageTemplates")}
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("single.title")} description={t("single.description")} />
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">{t("options.fileFormat")}</span>
            <Segmented<ExportFormat>
              aria-label={t("options.fileFormat")}
              value={p.format}
              onChange={p.onFormat}
              options={[
                { value: "png", label: "PNG" },
                { value: "svg", label: "SVG" },
                { value: "pdf", label: "PDF" },
              ]}
              className="self-start"
            />
            <p className="text-xs text-subtle">{t(`options.formatHint.${p.format}`)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={!p.hasFocus}
              loading={p.exporting !== null}
              onClick={p.onExportOne}
            >
              {p.exporting === null && <Download />}
              {tc("actions.download")}
            </Button>
            <Button variant="secondary" disabled={!p.hasFocus} onClick={p.onPrintOne}>
              <Printer />
              {tc("actions.print")}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={t("batch.title")}
          description={
            p.selectedCount === 0
              ? t("batch.none")
              : t("batch.summary", { count: p.selectedCount, sheets })
          }
        />
        <CardBody className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              disabled={p.selectedCount === 0}
              loading={running}
              onClick={p.onExportBatch}
            >
              {!running && <FileText />}
              {t("batch.createPdf")}
            </Button>
            <Button variant="secondary" disabled={p.selectedCount === 0 || running} onClick={p.onPrintBatch}>
              <Printer />
              {t("batch.print", { count: p.selectedCount })}
            </Button>
          </div>
          <p className="text-xs text-subtle">{t("batch.sheetHint", { perSheet })}</p>

          {p.batch.status !== "idle" && (
            <div className="flex flex-col gap-2 rounded border border-border bg-surface-2 p-3" role="status">
              {running && (
                <>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.max(6, (p.batch.done / p.batch.total) * 100)}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted">
                    {t("batch.progress", { done: p.batch.done, total: p.batch.total })}
                  </p>
                </>
              )}
              {p.batch.status === "done" && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-success">
                  <CheckCircle2 className="size-4" />
                  {t("batch.ready", { count: p.batch.parts.reduce((n, x) => n + x.count, 0) })}
                </p>
              )}
              {p.batch.status === "error" && (
                <p className="text-sm text-danger">
                  {t("batch.failed", { done: p.batch.done, total: p.batch.total })}
                </p>
              )}
              {p.batch.parts.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {p.batch.parts.map((part) => (
                    <li key={part.index} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">
                        {t("batch.part", { index: part.index, count: part.count })}
                      </span>
                      <Button asChild variant="ghost" size="sm">
                        <a href={sameOriginUrl(part.url)} target="_blank" rel="noopener noreferrer">
                          <ExternalLink />
                          {tc("actions.open")} ({part.ext.toUpperCase()})
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
