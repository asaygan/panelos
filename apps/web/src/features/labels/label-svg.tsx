"use client";

import { useMemo } from "react";
import {
  PT_TO_U,
  bindValue,
  u,
  type BoxElement,
  type FieldElement,
  type LabelData,
  type LabelElement,
  type LabelLayout,
  type LineElement,
  type LogoElement,
  type QrElement,
  type TextElement,
  type TextLikeProps,
} from "@/lib/api/label-layout";
import { qrMatrix } from "@/lib/api/qr-matrix";

export interface LabelSvgProps {
  layout: LabelLayout;
  data: LabelData;
  /** CSS px width applied to the svg; height derives from aspect. */
  scale?: number;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  className?: string;
  style?: React.CSSProperties;
}

const FONT_FAMILY: Record<TextLikeProps["font"], string> = {
  sans: "Inter, system-ui, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
};

function rotationTransform(el: LabelElement): string | undefined {
  if (!el.rotation) return undefined;
  const cx = u(el.x + el.w / 2);
  const cy = u(el.y + el.h / 2);
  return `rotate(${el.rotation} ${cx} ${cy})`;
}

// ── Background ──────────────────────────────────────────────────────────────────
function Background({ layout }: { layout: LabelLayout }) {
  const { w, h } = layout.size_mm;
  const { kind, fill, radius_mm } = layout.background;
  if (kind === "plain") {
    return (
      <rect
        x={0}
        y={0}
        width={u(w)}
        height={u(h)}
        rx={u(radius_mm)}
        fill={fill}
        stroke="#c9ccd0"
        strokeWidth={u(0.2)}
      />
    );
  }
  // engraved
  const screws: [number, number][] = [
    [3, 3],
    [w - 3, 3],
    [3, h - 3],
    [w - 3, h - 3],
  ];
  return (
    <>
      <rect x={0} y={0} width={u(w)} height={u(h)} rx={u(radius_mm)} fill="url(#engravedBg)" />
      <rect
        x={u(2)}
        y={u(2)}
        width={u(w - 4)}
        height={u(h - 4)}
        rx={u(1)}
        fill="none"
        stroke="#ffffff24"
        strokeWidth={u(0.25)}
      />
      {screws.map(([sx, sy], i) => (
        <circle key={i} cx={u(sx)} cy={u(sy)} r={u(1.2)} fill="url(#screwHole)" />
      ))}
    </>
  );
}

// ── Text / field ────────────────────────────────────────────────────────────────
function TextNode({
  el,
  content,
}: {
  el: FieldElement | TextElement;
  content: string;
}) {
  const text = el.uppercase ? content.toUpperCase() : content;
  let x = u(el.x);
  let anchor: "start" | "middle" | "end" = "start";
  if (el.align === "center") {
    x = u(el.x + el.w / 2);
    anchor = "middle";
  } else if (el.align === "right") {
    x = u(el.x + el.w);
    anchor = "end";
  }
  return (
    <text
      x={x}
      y={u(el.y + el.h / 2)}
      dominantBaseline="central"
      textAnchor={anchor}
      fontFamily={FONT_FAMILY[el.font]}
      fontSize={el.size_pt * PT_TO_U}
      fontWeight={el.weight}
      fill={el.color}
      letterSpacing={el.letter_spacing != null ? u(el.letter_spacing) : undefined}
    >
      {text}
    </text>
  );
}

// ── QR ───────────────────────────────────────────────────────────────────────────
function QrNode({ el, data }: { el: QrElement; data: LabelData }) {
  const value = bindValue("scan_url", data);
  const matrix = useMemo(() => qrMatrix(value), [value]);
  const boxMin = Math.min(el.w, el.h);
  const drawSize = Math.max(0, boxMin - 2 * el.quiet); // mm
  const moduleMm = drawSize / matrix.size;
  const offsetX = el.x + (el.w - drawSize) / 2;
  const offsetY = el.y + (el.h - drawSize) / 2;
  const rects: React.ReactElement[] = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.get(r, c)) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={u(offsetX + c * moduleMm)}
            y={u(offsetY + r * moduleMm)}
            width={u(moduleMm)}
            height={u(moduleMm)}
            fill={el.fg}
          />,
        );
      }
    }
  }
  return (
    <g shapeRendering="crispEdges">
      <rect x={u(el.x)} y={u(el.y)} width={u(el.w)} height={u(el.h)} fill={el.bg} />
      {rects}
    </g>
  );
}

// ── Logo ──────────────────────────────────────────────────────────────────────────
function LogoNode({ el, data }: { el: LogoElement; data: LabelData }) {
  if (el.source === "company" && data.logo_url) {
    return (
      <image
        href={data.logo_url}
        x={u(el.x)}
        y={u(el.y)}
        width={u(el.w)}
        height={u(el.h)}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }
  // monogram fallback
  const mono = (data.company_short || data.company || "?")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();
  return (
    <g>
      <rect
        x={u(el.x)}
        y={u(el.y)}
        width={u(el.w)}
        height={u(el.h)}
        rx={u(Math.min(el.w, el.h) * 0.15)}
        fill="#14171a"
      />
      <text
        x={u(el.x + el.w / 2)}
        y={u(el.y + el.h / 2)}
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily={FONT_FAMILY.sans}
        fontSize={Math.min(el.w, el.h) * u(1) * 0.42}
        fontWeight={700}
        fill="#ffffff"
      >
        {mono || "?"}
      </text>
    </g>
  );
}

function LineNode({ el }: { el: LineElement }) {
  return (
    <line
      x1={u(el.x)}
      y1={u(el.y)}
      x2={u(el.x + el.w)}
      y2={u(el.y + el.h)}
      stroke={el.stroke}
      strokeWidth={u(el.stroke_w)}
    />
  );
}

function BoxNode({ el }: { el: BoxElement }) {
  return (
    <rect
      x={u(el.x)}
      y={u(el.y)}
      width={u(el.w)}
      height={u(el.h)}
      rx={u(el.radius)}
      fill={el.fill}
      stroke={el.stroke === "none" ? undefined : el.stroke}
      strokeWidth={el.stroke === "none" ? undefined : u(el.stroke_w)}
    />
  );
}

function ElementNode({ el, data }: { el: LabelElement; data: LabelData }) {
  switch (el.type) {
    case "field":
      return <TextNode el={el} content={bindValue(el.binding, data)} />;
    case "text":
      return <TextNode el={el} content={el.text} />;
    case "qr":
      return <QrNode el={el} data={data} />;
    case "logo":
      return <LogoNode el={el} data={data} />;
    case "line":
      return <LineNode el={el} />;
    case "box":
      return <BoxNode el={el} />;
  }
}

/**
 * Pure presentational renderer for a v2 LabelLayout. Geometry matches the
 * backend contract exactly (UNITS_PER_MM, PT_TO_U, engraved bg, QR modules,
 * binding map) so on-screen preview == exported PNG/SVG.
 */
export function LabelSvg({
  layout,
  data,
  scale,
  interactive = false,
  selectedId = null,
  onSelect,
  className,
  style,
}: LabelSvgProps) {
  const { w, h } = layout.size_mm;
  const vbW = u(w);
  const vbH = u(h);
  const ordered = [...layout.elements].sort((a, b) => a.z - b.z);
  const widthPx = scale != null ? scale * w : undefined;

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      width={widthPx}
      height={widthPx != null ? scale! * h : undefined}
      className={className}
      style={{ display: "block", ...style }}
      onClick={interactive ? () => onSelect?.(null) : undefined}
    >
      <defs>
        <linearGradient id="engravedBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c3137" />
          <stop offset="55%" stopColor="#1b1f24" />
          <stop offset="100%" stopColor="#23282e" />
        </linearGradient>
        <radialGradient id="screwHole">
          <stop offset="0%" stopColor="#4a525a" />
          <stop offset="100%" stopColor="#0c0e10" />
        </radialGradient>
      </defs>
      <Background layout={layout} />
      {ordered.map((el) => {
        if (!el.visible) return null;
        const isSel = interactive && selectedId === el.id;
        return (
          <g
            key={el.id}
            transform={rotationTransform(el)}
            onClick={
              interactive
                ? (e) => {
                    e.stopPropagation();
                    onSelect?.(el.id);
                  }
                : undefined
            }
            style={interactive ? { cursor: "pointer" } : undefined}
          >
            <ElementNode el={el} data={data} />
            {isSel && (
              <rect
                x={u(el.x)}
                y={u(el.y)}
                width={u(el.w)}
                height={u(el.h)}
                fill="none"
                stroke="#5b8cff"
                strokeWidth={u(0.25)}
                strokeDasharray={`${u(0.8)} ${u(0.5)}`}
                pointerEvents="none"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
