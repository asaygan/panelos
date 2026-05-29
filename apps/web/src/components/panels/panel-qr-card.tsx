"use client";

import type { Panel } from "@/lib/api/types";
import { Card } from "@/components/primitives/card";
import { Btn } from "@/components/primitives/button";
import { QRGlyph } from "@/components/labels/qr-glyph";
import { Icon, type IconName } from "@/components/icons/icon";

export interface PanelQRCardProps {
  panel: Panel;
  onOpenLabel: () => void;
}

export function PanelQRCard({ panel, onOpenLabel }: PanelQRCardProps) {
  const tiles: [IconName, string][] = [
    ["scan-line", "Instant panel lookup"],
    ["file-text", "Latest approved schematic"],
    ["wifi-off", "Cached for offline use"],
    ["shield", "Role-based access only"],
  ];
  return (
    <div style={{ display: "flex", gap: "var(--gap)", alignItems: "flex-start" }}>
      <Card style={{ padding: 18, textAlign: "center" }}>
        <div
          style={{
            border: "1px solid var(--c-line-strong)",
            borderRadius: 8,
            padding: 14,
            background: "#fff",
            display: "inline-block",
          }}
        >
          <QRGlyph value={panel.serial} size={150} />
        </div>
        <div className="mono" style={{ fontWeight: 700, marginTop: 10 }}>
          {panel.serial}
        </div>
        <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>
          Rev {panel.rev} · {panel.tag}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
          <Btn size="sm" icon="qr-code" variant="primary" onClick={onOpenLabel}>
            Design label
          </Btn>
          <Btn size="sm" icon="download">
            PNG
          </Btn>
        </div>
      </Card>
      <Card style={{ flex: 1, padding: 14 }}>
        <div className="label-cap" style={{ marginBottom: 8 }}>
          What a scan opens
        </div>
        <div style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-2)", lineHeight: 1.6 }}>
          A field technician scanning this tag is taken straight to the panel&apos;s mobile record — current
          schematics, component schedule, live status, and revision history — with offline fallback if
          there&apos;s no signal in the cabinet room.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginTop: 14 }}>
          {tiles.map(([ic, t]) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 9,
                border: "1px solid var(--c-line)",
                borderRadius: "var(--r-sm)",
              }}
            >
              <Icon name={ic} size={15} style={{ color: "var(--c-accent)" }} />
              <span style={{ fontSize: "var(--fz-sm)", fontWeight: 540 }}>{t}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
