"use client";

import type { Panel } from "@/lib/api/types";
import { QRGlyph } from "./qr-glyph";

export interface LabelFields {
  name?: boolean;
  serial?: boolean;
  rev?: boolean;
  volt?: boolean;
  loc?: boolean;
}

export interface EngravedTagProps {
  panel: Panel;
  fields: LabelFields;
  scale?: number;
}

export function EngravedTag({ panel, fields, scale = 1 }: EngravedTagProps) {
  const W = 320 * scale;
  const H = 178 * scale;
  const screws: [number, number][] = [
    [12, 12],
    [W - 12, 12],
    [12, H - 12],
    [W - 12, H - 12],
  ];

  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: 7 * scale,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(150deg, #2c3137 0%, #1b1f24 55%, #23282e 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,.10), inset 0 0 0 1px rgba(0,0,0,.5), 0 6px 18px rgba(0,0,0,.28)",
        color: "#e9edf2",
        fontFamily: "var(--mono)",
      }}
    >
      {screws.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p[0] - 5 * scale,
            top: p[1] - 5 * scale,
            width: 10 * scale,
            height: 10 * scale,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #4a525a, #0c0e10)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,.6)",
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          inset: 18 * scale,
          border: "1px solid rgba(255,255,255,.14)",
          borderRadius: 3,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: 24 * scale,
          display: "flex",
          gap: 16 * scale,
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 * scale }}>
            <svg width={13 * scale} height={13 * scale} viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" strokeWidth="2.4">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M13 3 9 12h4l-2 9" />
            </svg>
            <span
              style={{
                fontSize: 10 * scale,
                fontWeight: 700,
                letterSpacing: ".12em",
                color: "#cdd6df",
              }}
            >
              NORTHFORGE
            </span>
          </div>
          <div
            style={{
              fontSize: 21 * scale,
              fontWeight: 700,
              marginTop: "auto",
              color: "#fff",
              letterSpacing: "-.01em",
            }}
          >
            {panel.tag}
          </div>
          {fields.name && (
            <div style={{ fontSize: 9.5 * scale, color: "#9aa6b2", marginTop: 2 * scale }}>
              {panel.name.toUpperCase()}
            </div>
          )}
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,.12)",
              margin: `${8 * scale}px 0`,
            }}
          />
          <div style={{ display: "flex", gap: 16 * scale, fontSize: 9 * scale }}>
            {fields.serial && (
              <div>
                <div style={{ color: "#6f7c89", fontSize: 7.5 * scale, letterSpacing: ".08em" }}>SERIAL</div>
                <div style={{ color: "#dde4ec" }}>{panel.serial}</div>
              </div>
            )}
            {fields.rev && (
              <div>
                <div style={{ color: "#6f7c89", fontSize: 7.5 * scale, letterSpacing: ".08em" }}>REV</div>
                <div style={{ color: "#dde4ec" }}>{panel.rev}</div>
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            flex: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "#fff", padding: 4 * scale, borderRadius: 3 }}>
            <QRGlyph value={panel.serial} size={84 * scale} />
          </div>
          <div
            style={{
              fontSize: 7 * scale,
              color: "#7d8a97",
              marginTop: 4 * scale,
              letterSpacing: ".1em",
            }}
          >
            SCAN FOR DOCS
          </div>
        </div>
      </div>
    </div>
  );
}
