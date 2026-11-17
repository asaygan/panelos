"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import type { Panel } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { renderLabel, renderLabelSheet } from "./label-api";
import {
  chunk,
  extensionOf,
  fileStem,
  saveFromUrl,
  sheetCapacity,
  type LabelChoice,
} from "./label-utils";

export type ExportFormat = "png" | "svg" | "pdf";

export interface SheetPart {
  index: number;
  count: number;
  url: string;
  ext: string;
}

export interface BatchState {
  status: "idle" | "running" | "done" | "error";
  done: number;
  total: number;
  parts: SheetPart[];
}

const IDLE: BatchState = { status: "idle", done: 0, total: 0, parts: [] };

/**
 * Server-side label exports for one design: single PNG / SVG / PDF and batch
 * PDF sheets. The API renders synchronously, so progress is counted per sheet.
 */
export function useLabelExport(choice: LabelChoice | undefined) {
  const t = useTranslations("labels");
  const errorText = useApiError();
  const [pending, setPending] = React.useState<ExportFormat | null>(null);
  const [batch, setBatch] = React.useState<BatchState>(IDLE);

  const exportOne = async (panel: Panel, format: ExportFormat) => {
    if (!choice || pending) return;
    setPending(format);
    try {
      if (format === "pdf") {
        const res = await renderLabelSheet([panel.id], choice);
        if (!res.pdf_url) throw new Error("empty");
        await saveFromUrl(res.pdf_url, `${fileStem(panel.tag)}.${extensionOf(res.pdf_url, "pdf")}`);
      } else {
        const res = await renderLabel(panel.id, choice, format);
        const url = format === "svg" ? res.svg_url : res.png_url;
        if (!url) throw new Error("empty");
        await saveFromUrl(url, `${fileStem(panel.tag)}.${format}`);
      }
      toast.success(t("toast.exported", { format: format.toUpperCase() }));
    } catch (e) {
      toast.error(e instanceof Error && e.message === "empty" ? t("toast.exportEmpty") : errorText(e));
    } finally {
      setPending(null);
    }
  };

  /** One PDF per A4 sheet: the API places only the first sheet's worth of labels in a PDF. */
  const exportBatch = async (panels: Panel[]) => {
    if (!choice || panels.length === 0 || batch.status === "running") return;
    const groups = chunk(panels, sheetCapacity(choice.layout).perSheet);
    setBatch({ status: "running", done: 0, total: groups.length, parts: [] });
    const parts: SheetPart[] = [];
    try {
      for (const [i, group] of groups.entries()) {
        const res = await renderLabelSheet(
          group.map((p) => p.id),
          choice,
        );
        if (!res.pdf_url) throw new Error("empty");
        parts.push({
          index: i + 1,
          count: res.count,
          url: res.pdf_url,
          ext: extensionOf(res.pdf_url, "pdf"),
        });
        setBatch({ status: "running", done: i + 1, total: groups.length, parts: [...parts] });
      }
      setBatch({ status: "done", done: groups.length, total: groups.length, parts });
      toast.success(t("toast.batchReady", { count: panels.length }));
    } catch (e) {
      setBatch({ status: "error", done: parts.length, total: groups.length, parts });
      toast.error(e instanceof Error && e.message === "empty" ? t("toast.exportEmpty") : errorText(e));
    }
  };

  const resetBatch = () => setBatch(IDLE);

  return { pending, batch, exportOne, exportBatch, resetBatch };
}
