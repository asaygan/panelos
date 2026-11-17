import type { LabelTemplate } from "@/data/types";
import { coerceLayout, type LabelLayout } from "@/lib/api/label-layout";

export type Concept = "engraved" | "plain";

/** What the API calls the template "concept": derived from the layout background. */
export function conceptOf(layout: LabelLayout): Concept {
  return layout.background.kind === "engraved" ? "engraved" : "plain";
}

/** "90x50": the size string the API stores and renders with. */
export function sizeKey(layout: LabelLayout): string {
  return `${layout.size_mm.w}x${layout.size_mm.h}`;
}

/** One selectable label design: a saved template, or a built-in fallback. */
export interface LabelChoice {
  id: string;
  name: string;
  isDefault: boolean;
  /** null for built-in designs (the API renders those by concept). */
  templateId: string | null;
  concept: Concept;
  layout: LabelLayout;
}

export function layoutFromTemplate(t: LabelTemplate): LabelLayout {
  const layout = coerceLayout(t.layout_json, t.concept === "plain" ? "plain" : "engraved");
  const orientation =
    t.orientation === "portrait" || t.orientation === "landscape"
      ? t.orientation
      : layout.orientation;
  return { ...layout, orientation };
}

export function choiceFromTemplate(t: LabelTemplate): LabelChoice {
  const layout = layoutFromTemplate(t);
  return {
    id: t.id,
    name: t.name,
    isDefault: t.is_default,
    templateId: t.id,
    concept: conceptOf(layout),
    layout,
  };
}

/**
 * How many labels fit on one A4 portrait sheet. Mirrors the API's imposition
 * (10 mm margin, 5 mm gap) which only fills the first sheet of a batch.
 */
export function sheetCapacity(layout: LabelLayout): { cols: number; rows: number; perSheet: number } {
  const { w, h } = layout.size_mm;
  const cols = Math.max(1, Math.floor((210 - 20 + 5) / (w + 5)));
  const rows = Math.max(1, Math.floor((297 - 20 + 5) / (h + 5)));
  return { cols, rows, perSheet: cols * rows };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Local storage presigns point at the API origin; route them through the same-origin proxy. */
export function sameOriginUrl(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.startsWith("/api/v1/files/") ? u.pathname + u.search : url;
  } catch {
    return url;
  }
}

function clickAnchor(href: string, filename: string, newTab: boolean) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  if (newTab) {
    a.target = "_blank";
    a.rel = "noopener";
  }
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Save a rendered file under a friendly name; falls back to opening it when the fetch is blocked. */
export async function saveFromUrl(url: string, filename: string): Promise<void> {
  const target = sameOriginUrl(url);
  try {
    const res = await fetch(target);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    clickAnchor(href, filename, false);
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch {
    clickAnchor(target, filename, true);
  }
}

/** File extension of a rendered batch (the API falls back to SVG when PDF output is unavailable). */
export function extensionOf(url: string, fallback: string): string {
  const path = url.split("?")[0] ?? "";
  const m = /\.([a-z0-9]{2,4})$/i.exec(path);
  return m ? m[1]!.toLowerCase() : fallback;
}

/** Safe file name stem from a panel tag. */
export function fileStem(tag: string): string {
  return tag.replace(/[^\p{L}\p{N}._-]+/gu, "_") || "label";
}
