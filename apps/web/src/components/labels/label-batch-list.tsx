"use client";

import { Badge } from "@/components/primitives/badge";
import { Btn } from "@/components/primitives/button";
import { Icon } from "@/components/icons/icon";
import type { Panel } from "@/lib/api/types";
import { QRGlyph } from "./qr-glyph";

export interface LabelBatchListProps {
  panels: Panel[];
  onRemove: (id: string) => void;
  onAdd?: () => void;
}

export function LabelBatchList({ panels, onRemove, onAdd }: LabelBatchListProps) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span className="label-cap">Print batch</span>
        <Badge tone="accent">{panels.length}</Badge>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {panels.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: 8,
              border: "1px solid var(--c-line)",
              borderRadius: "var(--r-sm)",
            }}
          >
            <div
              style={{
                border: "1px solid var(--c-line-strong)",
                borderRadius: 3,
                padding: 2,
                background: "#fff",
                flex: "none",
              }}
            >
              <QRGlyph value={p.serial} size={30} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 11, fontWeight: 700 }}>
                {p.tag}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--c-ink-3)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {p.serial}
              </div>
            </div>
            <Btn icon="x" variant="ghost" size="sm" onClick={() => onRemove(p.id)} />
          </div>
        ))}
      </div>
      {onAdd && (
        <Btn
          size="sm"
          icon="plus"
          className="mt-2 w-full justify-center"
          onClick={onAdd}
        >
          Add current panel
        </Btn>
      )}
      <div
        style={{
          marginTop: 16,
          padding: 11,
          background: "var(--c-surface-3)",
          borderRadius: "var(--r-sm)",
          fontSize: 11,
          color: "var(--c-ink-3)",
          lineHeight: 1.5,
        }}
      >
        <Icon name="printer" size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
        Batch exports as a single imposition sheet sized for your label stock. Engraved tags export as
        vector for CNC/rotary engravers.
      </div>
    </div>
  );
}
