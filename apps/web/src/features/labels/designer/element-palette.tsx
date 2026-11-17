"use client";

import { useTranslations } from "next-intl";
import type { ElementType } from "@/lib/api/label-layout";
import { ELEMENT_ICONS } from "./element-meta";

const KINDS: ElementType[] = ["field", "text", "qr", "logo", "line", "box"];

export function ElementPalette({ onAdd }: { onAdd: (kind: ElementType) => void }) {
  const t = useTranslations("labels");
  return (
    <div className="grid grid-cols-2 gap-2">
      {KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          onClick={() => onAdd(kind)}
          className="flex h-9 items-center gap-2 rounded border border-border-strong bg-surface px-2.5 text-sm font-medium shadow-sm hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 [&_svg]:size-4 [&_svg]:text-subtle"
        >
          {ELEMENT_ICONS[kind]}
          {t(`elements.${kind}`)}
        </button>
      ))}
    </div>
  );
}
