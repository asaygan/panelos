"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { LabelData, LabelElement, LabelLayout } from "@/lib/api/label-layout";
import { cn } from "@/lib/utils/cn";
import { LabelSvg } from "../label-svg";

export interface EditorCanvasProps {
  layout: LabelLayout;
  data: LabelData;
  /** CSS px per mm. */
  scale: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Called once when a drag starts (history snapshot). */
  onBeginDrag: () => void;
  /** Called on every pointer move of a drag. */
  onDrag: (el: LabelElement) => void;
  /** Discrete edits (keyboard nudges). */
  onChange: (el: LabelElement, key?: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

type HandleKind = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate" | "move";
const RESIZE_HANDLES: HandleKind[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const HANDLE_CURSOR: Record<string, string> = {
  nw: "cursor-nwse-resize",
  se: "cursor-nwse-resize",
  ne: "cursor-nesw-resize",
  sw: "cursor-nesw-resize",
  n: "cursor-ns-resize",
  s: "cursor-ns-resize",
  e: "cursor-ew-resize",
  w: "cursor-ew-resize",
};

interface DragState {
  kind: HandleKind;
  startX: number;
  startY: number;
  orig: LabelElement;
}

interface Guide {
  axis: "x" | "y";
  pos: number; // mm
}

const SNAP_TOL_MM = 0.6;
const snap = (value: number, step: number, enabled: boolean) =>
  !enabled || step <= 0 ? value : Math.round(value / step) * step;

/** Keys must not move elements while the user works in a control. */
function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) || el.isContentEditable) return true;
  return !!el.closest('[role="combobox"],[role="listbox"],[role="menu"],[role="dialog"],[role="radiogroup"]');
}

/**
 * Interactive layer over LabelSvg: select, drag, resize (8 handles), rotate,
 * snap-to-grid + alignment guides, and keyboard nudge/delete/duplicate.
 */
export function EditorCanvas({
  layout,
  data,
  scale,
  selectedId,
  onSelect,
  onBeginDrag,
  onDrag,
  onChange,
  onDelete,
  onDuplicate,
}: EditorCanvasProps) {
  const t = useTranslations("labels");
  const { w, h } = layout.size_mm;
  const grid = layout.grid_mm > 0 ? layout.grid_mm : 1;
  const snapOn = layout.snap !== false;
  const overlayRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<DragState | null>(null);
  const [guides, setGuides] = React.useState<Guide[]>([]);
  const selected = layout.elements.find((e) => e.id === selectedId) ?? null;

  const describe = (el: LabelElement) =>
    el.type === "field"
      ? t(`bindings.${el.binding}`)
      : el.type === "text"
        ? el.text || t("elements.text")
        : t(`elements.${el.type}`);

  // alignment guides: edges/centres of the label and of every other element
  const computeGuides = (el: LabelElement) => {
    const targetsX = [0, w / 2, w];
    const targetsY = [0, h / 2, h];
    for (const o of layout.elements) {
      if (o.id === el.id) continue;
      targetsX.push(o.x, o.x + o.w / 2, o.x + o.w);
      targetsY.push(o.y, o.y + o.h / 2, o.y + o.h);
    }
    const elXs = [el.x, el.x + el.w / 2, el.x + el.w];
    const elYs = [el.y, el.y + el.h / 2, el.y + el.h];
    const lines: Guide[] = [];
    let snapX: number | undefined;
    let snapY: number | undefined;
    for (const ex of elXs) {
      const hit = targetsX.find((tx) => Math.abs(ex - tx) <= SNAP_TOL_MM);
      if (hit !== undefined) {
        snapX = hit - (ex - el.x);
        lines.push({ axis: "x", pos: hit });
        break;
      }
    }
    for (const ey of elYs) {
      const hit = targetsY.find((ty) => Math.abs(ey - ty) <= SNAP_TOL_MM);
      if (hit !== undefined) {
        snapY = hit - (ey - el.y);
        lines.push({ axis: "y", pos: hit });
        break;
      }
    }
    return { x: snapX, y: snapY, lines };
  };

  const startDrag = (el: LabelElement, kind: HandleKind) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(el.id);
    onBeginDrag();
    drag.current = { kind, startX: e.clientX, startY: e.clientY, orig: el };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    const o = d.orig;
    let next: LabelElement = { ...o };

    if (d.kind === "move") {
      next = { ...o, x: snap(o.x + dx, grid, snapOn), y: snap(o.y + dy, grid, snapOn) };
      if (snapOn) {
        const g = computeGuides(next);
        if (g.x !== undefined) next = { ...next, x: g.x };
        if (g.y !== undefined) next = { ...next, y: g.y };
        setGuides(g.lines);
      }
    } else if (d.kind === "rotate") {
      const rect = overlayRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const mx = (e.clientX - rect.left) / scale;
        const my = (e.clientY - rect.top) / scale;
        const deg = Math.round((Math.atan2(my - cy, mx - cx) * 180) / Math.PI + 90);
        next = { ...o, rotation: ((deg % 360) + 360) % 360 };
      }
    } else {
      let { x, y, w: ew, h: eh } = o;
      const min = 1;
      if (d.kind.includes("e")) ew = Math.max(min, snap(o.w + dx, grid, snapOn));
      if (d.kind.includes("s")) eh = Math.max(min, snap(o.h + dy, grid, snapOn));
      if (d.kind.includes("w")) {
        ew = Math.max(min, o.x + o.w - snap(o.x + dx, grid, snapOn));
        x = o.x + o.w - ew;
      }
      if (d.kind.includes("n")) {
        eh = Math.max(min, o.y + o.h - snap(o.y + dy, grid, snapOn));
        y = o.y + o.h - eh;
      }
      next = { ...o, x, y, w: ew, h: eh };
    }

    next.x = Math.max(0, Math.min(w - next.w, next.x));
    next.y = Math.max(0, Math.min(h - next.h, next.y));
    onDrag(next);
  };

  const endDrag = () => {
    drag.current = null;
    setGuides([]);
  };

  // keyboard: nudge (Shift = 5 mm) / delete / duplicate the selected element
  React.useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.altKey) return;
      const mod = e.metaKey || e.ctrlKey;
      // other shortcuts (undo, save, …) belong to the page
      if (mod && e.key.toLowerCase() !== "d") return;
      const step = e.shiftKey ? 5 : 1;
      const key = `nudge:${selected.id}`;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onChange({ ...selected, x: Math.max(0, selected.x - step) }, key);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onChange({ ...selected, x: Math.min(w - selected.w, selected.x + step) }, key);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onChange({ ...selected, y: Math.max(0, selected.y - step) }, key);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onChange({ ...selected, y: Math.min(h - selected.h, selected.y + step) }, key);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDelete(selected.id);
      } else if (mod) {
        e.preventDefault();
        onDuplicate(selected.id);
      } else if (e.key === "Escape") {
        onSelect(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected, onChange, onDelete, onDuplicate, onSelect, w, h]);

  const widthPx = w * scale;
  const heightPx = h * scale;

  const handlePoint = (k: HandleKind, el: LabelElement): [number, number] => {
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
    return map[k]!;
  };

  return (
    <div className="relative shrink-0 shadow-lg" style={{ width: widthPx, height: heightPx }}>
      <LabelSvg layout={layout} data={data} scale={scale} />
      <div
        ref={overlayRef}
        className="absolute inset-0 touch-none"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerDown={() => onSelect(null)}
      >
        {[...layout.elements]
          .filter((e) => e.visible)
          .sort((a, b) => a.z - b.z)
          .map((el) => (
            <button
              key={el.id}
              type="button"
              aria-label={describe(el)}
              aria-pressed={selectedId === el.id}
              onPointerDown={startDrag(el, "move")}
              onFocus={() => selectedId !== el.id && onSelect(el.id)}
              className={cn(
                "absolute cursor-move rounded-[1px] outline outline-1 outline-transparent hover:outline-info/40 focus-visible:outline-info",
                selectedId === el.id && "outline-info hover:outline-info",
              )}
              style={{
                left: el.x * scale,
                top: el.y * scale,
                width: el.w * scale,
                height: Math.max(4, el.h * scale),
                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              }}
            />
          ))}

        {guides.map((g, i) => (
          <div
            key={`${g.axis}-${i}`}
            aria-hidden
            className="pointer-events-none absolute bg-danger"
            style={
              g.axis === "x"
                ? { left: g.pos * scale, top: 0, width: 1, height: heightPx }
                : { top: g.pos * scale, left: 0, height: 1, width: widthPx }
            }
          />
        ))}

        {selected && (
          <>
            {RESIZE_HANDLES.map((k) => {
              const [mx, my] = handlePoint(k, selected);
              return (
                <div
                  key={k}
                  aria-hidden
                  onPointerDown={startDrag(selected, k)}
                  className={cn(
                    "absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-[2px] border-[1.5px] border-info bg-surface",
                    HANDLE_CURSOR[k],
                  )}
                  style={{ left: mx * scale, top: my * scale }}
                />
              );
            })}
            <div
              aria-hidden
              title={t("canvas.rotate")}
              onPointerDown={startDrag(selected, "rotate")}
              className="absolute size-2.5 -translate-x-1/2 cursor-grab rounded-full bg-info"
              style={{
                left: (selected.x + selected.w / 2) * scale,
                top: selected.y * scale - 22,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
