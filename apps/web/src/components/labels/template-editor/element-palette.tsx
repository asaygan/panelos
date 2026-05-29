"use client";

import type { ElementType } from "@/lib/api/label-layout";
import { Icon, type IconName } from "@/components/icons/icon";

const ITEMS: { kind: ElementType; label: string; icon: IconName }[] = [
  { kind: "field", label: "Field", icon: "hash" },
  { kind: "text", label: "Text", icon: "file-text" },
  { kind: "qr", label: "QR", icon: "qr-code" },
  { kind: "logo", label: "Logo", icon: "building" },
  { kind: "line", label: "Line", icon: "list" },
  { kind: "box", label: "Box", icon: "box" },
];

export interface ElementPaletteProps {
  onAdd: (kind: ElementType) => void;
}

export function ElementPalette({ onAdd }: ElementPaletteProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {ITEMS.map((it) => (
        <button
          key={it.kind}
          onClick={() => onAdd(it.kind)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 10px",
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--c-line-strong)",
            background: "var(--c-surface)",
            cursor: "pointer",
            fontSize: "var(--fz-sm)",
            color: "var(--c-ink)",
            fontWeight: 560,
          }}
        >
          <Icon name={it.icon} size={13} />
          {it.label}
        </button>
      ))}
    </div>
  );
}
