"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LabelSvg } from "@/components/labels/label-svg";
import type { LabelData, LabelElement, LabelLayout } from "@/lib/api/label-layout";

export interface EditorCanvasProps {
  layout: LabelLayout;
  data: LabelData;
  /** CSS px per mm. */
  scale: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (el: LabelElement) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

type HandleKind =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "rotate"
  | "move";

interface DragState {
  kind: HandleKind;
  startPxX: number;
  startPxY: number;
  orig: LabelElement;
}

interface Guide {
  axis: "x" | "y";
  pos: number; // mm
}

const SNAP_TOL_MM = 0.6;

function snap(value: number, step: number, enabled: boolean): number {
  if (!enabled || step <= 0) return value;
  return Math.round(value / step) * step;
}

export function EditorCanvas({
  layout,
  data,
  scale,
  selectedId,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
}: EditorCanvasProps) {
  const { w, h } = layout.size_mm;
  const grid = layout.grid_mm > 0 ? layout.grid_mm : 1;
  const snapOn = layout.snap !== false;
  const overlayRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);

  const selected = layout.elements.find((e) => e.id === selectedId) ?? null;

  // ── alignment guides: compare against other elements + canvas centers ──────────
  const computeGuides = useCallback(
    (el: LabelElement): { x?: number; y?: number; lines: Guide[] } => {
      const targetsX = [0, w / 2, w];
      const targetsY = [0, h / 2, h];
      for (const other of layout.elements) {
        if (other.id === el.id) continue;
        targetsX.push(other.x, other.x + other.w / 2, other.x + other.w);
        targetsY.push(other.y, other.y + other.h / 2, other.y + other.h);
      }
      const elXs = [el.x, el.x + el.w / 2, el.x + el.w];
      const elYs = [el.y, el.y + el.h / 2, el.y + el.h];
      const lines: Guide[] = [];
      let snapX: number | undefined;
      let snapY: number | undefined;
      for (let i = 0; i < elXs.length; i++) {
        for (const t of targetsX) {
          if (Math.abs(elXs[i]! - t) <= SNAP_TOL_MM) {
            snapX = t - (elXs[i]! - el.x);
            lines.push({ axis: "x", pos: t });
            break;
          }
        }
        if (snapX != null) break;
      }
      for (let i = 0; i < elYs.length; i++) {
        for (const t of targetsY) {
          if (Math.abs(elYs[i]! - t) <= SNAP_TOL_MM) {
            snapY = t - (elYs[i]! - el.y);
            lines.push({ axis: "y", pos: t });
            break;
          }
        }
        if (snapY != null) break;
      }
      return { x: snapX, y: snapY, lines };
    },
    [layout.elements, w, h],
  );

  const onPointerDownEl =
    (el: LabelElement, kind: HandleKind) => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(el.id);
      drag.current = { kind, startPxX: e.clientX, startPxY: e.clientY, orig: el };
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dxMm = (e.clientX - d.startPxX) / scale;
    const dyMm = (e.clientY - d.startPxY) / scale;
    const o = d.orig;
    let next: LabelElement = { ...o };

    if (d.kind === "move") {
      next = { ...o, x: snap(o.x + dxMm, grid, snapOn), y: snap(o.y + dyMm, grid, snapOn) };
      const g = computeGuides(next);
      if (g.x != null) next = { ...next, x: g.x };
      if (g.y != null) next = { ...next, y: g.y };
      setGuides(g.lines);
    } else if (d.kind === "rotate") {
      const cx = o.x + o.w / 2;
      const cy = o.y + o.h / 2;
      const px = o.x + dxMm; // not used directly
      void px;
      const rect = overlayRef.current?.getBoundingClientRect();
      if (rect) {
        const mx = (e.clientX - rect.left) / scale;
        const my = (e.clientY - rect.top) / scale;
        let deg = (Math.atan2(my - cy, mx - cx) * 180) / Math.PI + 90;
        deg = Math.round(deg);
        next = { ...o, rotation: ((deg % 360) + 360) % 360 };
      }
    } else {
      // resize
      let { x, y, w: ew, h: eh } = o;
      const min = 1;
      if (d.kind.includes("e")) ew = Math.max(min, snap(o.w + dxMm, grid, snapOn));
      if (d.kind.includes("s")) eh = Math.max(min, snap(o.h + dyMm, grid, snapOn));
      if (d.kind.includes("w")) {
        const nx = snap(o.x + dxMm, grid, snapOn);
        ew = Math.max(min, o.x + o.w - nx);
        x = o.x + o.w - ew;
      }
      if (d.kind.includes("n")) {
        const ny = snap(o.y + dyMm, grid, snapOn);
        eh = Math.max(min, o.y + o.h - ny);
        y = o.y + o.h - eh;
      }
      next = { ...o, x, y, w: ew, h: eh };
    }

    // clamp inside label
    next.x = Math.max(0, Math.min(w - next.w, next.x));
    next.y = Math.max(0, Math.min(h - next.h, next.y));
    onChange(next);
  };

  const onPointerUp = () => {
    drag.current = null;
    setGuides([]);
  };

  // ── keyboard: nudge / delete / duplicate ───────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChange({ ...selected, x: Math.max(0, selected.x - step) });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onChange({ ...selected, x: Math.min(w - selected.w, selected.x + step) });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onChange({ ...selected, y: Math.max(0, selected.y - step) });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onChange({ ...selected, y: Math.min(h - selected.h, selected.y + step) });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDelete(selected.id);
      } else if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        onDuplicate(selected.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, onChange, onDelete, onDuplicate, w, h]);

  const widthPx = w * scale;
  const heightPx = h * scale;

  const handleKinds: HandleKind[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const handlePos = (k: HandleKind, el: LabelElement): { left: number; top: number } => {
    const map: Record<string, [number, number]> = {
      nw: [el.x, el.y],
      n: [el.x + el.w / 2, el.y],
      ne: [el.x + el.w, el.y],
      e: [el.x + el.w, el.y + el.h / 2],
      se: [el.x + el.w, el.y + el.h],
      s: [el.x + el.w / 2, el.y + el.h],
      sw: [el.x, el.y + el.h],
      w: [el.x, el.y + el.h / 2],
    };
    const [mx, my] = map[k]!;
    return { left: mx * scale, top: my * scale };
  };

  const cursorFor = (k: HandleKind): string => {
    const m: Record<string, string> = {
      nw: "nwse-resize",
      se: "nwse-resize",
      ne: "nesw-resize",
      sw: "nesw-resize",
      n: "ns-resize",
      s: "ns-resize",
      e: "ew-resize",
      w: "ew-resize",
    };
    return m[k] ?? "default";
  };

  return (
    <div style={{ position: "relative", width: widthPx, height: heightPx }}>
      <LabelSvg layout={layout} data={data} scale={scale} />
      <div
        ref={overlayRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerDown={() => onSelect(null)}
        style={{
          position: "absolute",
          inset: 0,
          touchAction: "none",
        }}
      >
        {/* clickable hit areas per element */}
        {[...layout.elements]
          .filter((e) => e.visible)
          .sort((a, b) => a.z - b.z)
          .map((el) => (
            <div
              key={el.id}
              onPointerDown={onPointerDownEl(el, "move")}
              style={{
                position: "absolute",
                left: el.x * scale,
                top: el.y * scale,
                width: el.w * scale,
                height: Math.max(4, el.h * scale),
                transform: el.rotation
                  ? `rotate(${el.rotation}deg)`
                  : undefined,
                transformOrigin: "center",
                cursor: "move",
                outline:
                  selectedId === el.id ? "1px solid #5b8cff" : "1px solid transparent",
              }}
            />
          ))}

        {/* alignment guides */}
        {guides.map((g, i) =>
          g.axis === "x" ? (
            <div
              key={`gx-${i}`}
              style={{
                position: "absolute",
                left: g.pos * scale,
                top: 0,
                width: 1,
                height: heightPx,
                background: "#ff5b8c",
                pointerEvents: "none",
              }}
            />
          ) : (
            <div
              key={`gy-${i}`}
              style={{
                position: "absolute",
                top: g.pos * scale,
                left: 0,
                height: 1,
                width: widthPx,
                background: "#ff5b8c",
                pointerEvents: "none",
              }}
            />
          ),
        )}

        {/* selection handles */}
        {selected && (
          <>
            {handleKinds.map((k) => {
              const p = handlePos(k, selected);
              return (
                <div
                  key={k}
                  onPointerDown={onPointerDownEl(selected, k)}
                  style={{
                    position: "absolute",
                    left: p.left - 4,
                    top: p.top - 4,
                    width: 8,
                    height: 8,
                    background: "#fff",
                    border: "1.5px solid #5b8cff",
                    borderRadius: 2,
                    cursor: cursorFor(k),
                  }}
                />
              );
            })}
            {/* rotate handle */}
            <div
              onPointerDown={onPointerDownEl(selected, "rotate")}
              style={{
                position: "absolute",
                left: (selected.x + selected.w / 2) * scale - 5,
                top: selected.y * scale - 22,
                width: 10,
                height: 10,
                background: "#5b8cff",
                borderRadius: "50%",
                cursor: "grab",
              }}
              title="Rotate"
            />
          </>
        )}
      </div>
    </div>
  );
}
