import { api } from "@/lib/api/client";
import type { LabelBatch, LabelOut } from "@/data/types";
import { sizeKey, type LabelChoice } from "./label-utils";

/** Render one label to PNG/SVG on the server (the API stores it and returns download URLs). */
export function renderLabel(panelId: string, choice: LabelChoice, format: "png" | "svg") {
  return api.post<LabelOut>("/labels", {
    panel_id: panelId,
    template: choice.concept,
    format,
    size: sizeKey(choice.layout),
    template_id: choice.templateId ?? undefined,
  });
}

/**
 * Render a PDF sheet (labels imposed on A4). Local to this feature because
 * `labelsApi.renderBatch` cannot pass `template_id`, so saved templates would
 * silently fall back to the built-in design.
 */
export function renderLabelSheet(panelIds: string[], choice: LabelChoice) {
  return api.post<LabelBatch>("/labels/batch", {
    panel_ids: panelIds,
    template: choice.concept,
    template_id: choice.templateId ?? undefined,
  });
}
