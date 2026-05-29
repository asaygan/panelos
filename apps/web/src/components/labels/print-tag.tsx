"use client";

import type { Panel } from "@/lib/api/types";
import { QRGlyph } from "./qr-glyph";
import type { LabelFields } from "./engraved-tag";

export interface PrintTagProps {
  panel: Panel;
  fields: LabelFields;
  scale?: number;
}

function Pair({ k, v, scale }: { k: string; v: string; scale: number }) {
  return (
    <div style={{ fontSize: 9 * scale }}>
      <span style={{ color: "#888", marginRight: 4 * scale }}>{k}</span>
      <span style={{ fontWeight: 700 }}>{v}</span>
    </div>
  );
}

export function PrintTag({ panel, fields, scale = 1 }: PrintTagProps) {
  const W = 320 * scale;
  const H = 178 * scale;
  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: 4,
        background: "#fff",
        color: "#000",
        border: "1px solid #c9ccd0",
        boxShadow: "0 6px 18px rgba(0,0,0,.16)",
        position: "relative",
        fontFamily: "var(--font)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          background: "#000",
          color: "#fff",
          padding: `${6 * scale}px ${12 * scale}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 9 * scale, fontWeight: 800, letterSpacing: ".14em" }}>
          NORTHFORGE AUTOMATION
        </span>
        <span style={{ fontSize: 8 * scale, letterSpacing: ".06em", opacity: 0.8 }}>
          PANELOS ASSET
        </span>
      </div>
      <div style={{ flex: 1, display: "flex", padding: 12 * scale, gap: 12 * scale }}>
        <div style={{ flex: "none", border: "2px solid #000", padding: 4 * scale }}>
          <QRGlyph value={panel.serial} size={92 * scale} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26 * scale,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "-.02em",
              fontFamily: "var(--mono)",
            }}
          >
            {panel.tag}
          </div>
          {fields.name && (
            <div style={{ fontSize: 10 * scale, fontWeight: 600, marginTop: 3 * scale }}>
              {panel.name}
            </div>
          )}
          <div
            style={{
              marginTop: "auto",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: `${3 * scale}px ${10 * scale}px`,
              fontFamily: "var(--mono)",
            }}
          >
            {fields.serial && <Pair scale={scale} k="S/N" v={panel.serial} />}
            {fields.rev && <Pair scale={scale} k="REV" v={panel.rev} />}
            {fields.volt && <Pair scale={scale} k="V" v={panel.volt} />}
            {fields.loc && <Pair scale={scale} k="LOC" v={panel.loc.split(" — ")[0] ?? panel.loc} />}
          </div>
        </div>
      </div>
      <div
        style={{
          borderTop: "1px solid #000",
          padding: `${4 * scale}px ${12 * scale}px`,
          display: "flex",
          justifyContent: "space-between",
          fontSize: 7.5 * scale,
          fontFamily: "var(--mono)",
        }}
      >
        <span>IEC 61439</span>
        <span>scan ▸ panelos.app/p/{panel.serial}</span>
      </div>
    </div>
  );
}
