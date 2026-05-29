"use client";

import { QRCodeSVG } from "qrcode.react";

export interface QRGlyphProps {
  value: string;
  size?: number;
  fg?: string;
  bg?: string;
  /** When true, falls back to a deterministic pattern (offline / Storybook). */
  fallback?: boolean;
}

export function QRGlyph({
  value,
  size = 96,
  fg = "#14171a",
  bg = "#ffffff",
  fallback = false,
}: QRGlyphProps) {
  if (fallback) return <DeterministicPattern value={value} size={size} fg={fg} bg={bg} />;
  return (
    <QRCodeSVG
      value={value}
      size={size}
      bgColor={bg}
      fgColor={fg}
      level="M"
      style={{ display: "block", shapeRendering: "crispEdges" }}
    />
  );
}

// Deterministic pattern (ported from prototype) — looks like a QR but isn't scannable.
function DeterministicPattern({
  value,
  size,
  fg,
  bg,
}: {
  value: string;
  size: number;
  fg: string;
  bg: string;
}) {
  const cells = 21;
  let seed = 0;
  for (const c of value) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const grid: boolean[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const finder =
        (x < 7 && y < 7) ||
        (x >= cells - 7 && y < 7) ||
        (x < 7 && y >= cells - 7);
      if (finder) {
        const lx = x >= cells - 7 ? x - (cells - 7) : x;
        const ly = y >= cells - 7 ? y - (cells - 7) : y;
        const on =
          lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
        grid.push(on);
      } else {
        grid.push(rng() > 0.5);
      }
    }
  }
  const s = size / cells;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", shapeRendering: "crispEdges" }}
    >
      <rect width={size} height={size} fill={bg} />
      {grid.map(
        (on, i) =>
          on && (
            <rect
              key={i}
              x={(i % cells) * s}
              y={Math.floor(i / cells) * s}
              width={s}
              height={s}
              fill={fg}
            />
          ),
      )}
    </svg>
  );
}
