"use client";

import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Btn } from "@/components/primitives/button";
import {
  BINDINGS,
  SIZE_PRESETS,
  orientationOf,
  type Align,
  type Binding,
  type BackgroundKind,
  type FieldElement,
  type FontKind,
  type FontWeight,
  type LabelElement,
  type LabelLayout,
  type TextElement,
} from "@/lib/api/label-layout";

export interface InspectorProps {
  layout: LabelLayout;
  selected: LabelElement | null;
  onChangeElement: (el: LabelElement) => void;
  onChangeLayout: (layout: LabelLayout) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onZ: (id: string, dir: "forward" | "back") => void;
}

const num = (v: string, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const WEIGHTS: FontWeight[] = [400, 500, 600, 700, 800];

function NumRow({
  label,
  value,
  onChange,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(num(e.target.value, value))}
      />
    </Field>
  );
}

function isTextLike(el: LabelElement): el is FieldElement | TextElement {
  return el.type === "field" || el.type === "text";
}

export function Inspector({
  layout,
  selected,
  onChangeElement,
  onChangeLayout,
  onDelete,
  onDuplicate,
  onZ,
}: InspectorProps) {
  // ── Document props (nothing selected) ──────────────────────────────────────────
  if (!selected) {
    const { w, h } = layout.size_mm;
    const presetVal = `${w}x${h}`;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}>
        <div className="label-cap">Document</div>
        <Field label="Orientation">
          <div style={{ display: "flex", gap: 6 }}>
            {(["landscape", "portrait"] as const).map((o) => (
              <button
                key={o}
                onClick={() => {
                  if (layout.orientation === o) return;
                  onChangeLayout({
                    ...layout,
                    orientation: o,
                    size_mm: { w: h, h: w },
                  });
                }}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  fontSize: "var(--fz-sm)",
                  textTransform: "capitalize",
                  borderRadius: "var(--r-sm)",
                  border:
                    "1px solid " +
                    (layout.orientation === o ? "var(--c-accent)" : "var(--c-line-strong)"),
                  background:
                    layout.orientation === o ? "var(--c-accent-soft)" : "transparent",
                  cursor: "pointer",
                }}
              >
                {o}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Size preset">
          <Select
            value={SIZE_PRESETS.some((p) => `${p.w}x${p.h}` === presetVal) ? presetVal : "custom"}
            onChange={(e) => {
              const p = SIZE_PRESETS.find((x) => `${x.w}x${x.h}` === e.target.value);
              if (p)
                onChangeLayout({
                  ...layout,
                  size_mm: { w: p.w, h: p.h },
                  orientation: orientationOf({ w: p.w, h: p.h }),
                });
            }}
          >
            {SIZE_PRESETS.map((p) => (
              <option key={p.label} value={`${p.w}x${p.h}`}>
                {p.label} mm
              </option>
            ))}
            <option value="custom">Custom</option>
          </Select>
        </Field>
        <div style={{ display: "flex", gap: 8 }}>
          <NumRow
            label="Width mm"
            value={w}
            step={1}
            onChange={(v) =>
              onChangeLayout({
                ...layout,
                size_mm: { ...layout.size_mm, w: v },
                orientation: orientationOf({ w: v, h }),
              })
            }
          />
          <NumRow
            label="Height mm"
            value={h}
            step={1}
            onChange={(v) =>
              onChangeLayout({
                ...layout,
                size_mm: { ...layout.size_mm, h: v },
                orientation: orientationOf({ w, h: v }),
              })
            }
          />
        </div>
        <Field label="Background">
          <Select
            value={layout.background.kind}
            onChange={(e) => {
              const kind = e.target.value as BackgroundKind;
              onChangeLayout({
                ...layout,
                background: {
                  ...layout.background,
                  kind,
                  fill: kind === "engraved" ? "#1f242b" : "#ffffff",
                },
              });
            }}
          >
            <option value="engraved">Engraved</option>
            <option value="plain">Plain</option>
          </Select>
        </Field>
        <Field label="Background fill">
          <Input
            type="color"
            value={layout.background.fill}
            onChange={(e) =>
              onChangeLayout({
                ...layout,
                background: { ...layout.background, fill: e.target.value },
              })
            }
          />
        </Field>
        <NumRow
          label="Corner radius mm"
          value={layout.background.radius_mm}
          onChange={(v) =>
            onChangeLayout({ ...layout, background: { ...layout.background, radius_mm: v } })
          }
        />
        <NumRow
          label="Grid mm"
          value={layout.grid_mm}
          onChange={(v) => onChangeLayout({ ...layout, grid_mm: Math.max(0, v) })}
        />
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fz-sm)" }}
        >
          <input
            type="checkbox"
            checked={layout.snap !== false}
            onChange={(e) => onChangeLayout({ ...layout, snap: e.target.checked })}
          />
          Snap to grid + guides
        </label>
      </div>
    );
  }

  // ── Element props ────────────────────────────────────────────────────────────────
  const el = selected;
  const set = (patch: Partial<LabelElement>) =>
    onChangeElement({ ...el, ...patch } as LabelElement);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 12 }}>
      <div className="label-cap" style={{ textTransform: "uppercase" }}>
        {el.type}
      </div>

      {el.type === "field" && (
        <Field label="Binding">
          <Select
            value={(el as FieldElement).binding}
            onChange={(e) => set({ binding: e.target.value as Binding })}
          >
            {BINDINGS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {el.type === "text" && (
        <Field label="Text">
          <Input
            value={(el as TextElement).text}
            onChange={(e) => set({ text: e.target.value })}
          />
        </Field>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <NumRow label="X mm" value={el.x} onChange={(v) => set({ x: v })} />
        <NumRow label="Y mm" value={el.y} onChange={(v) => set({ y: v })} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <NumRow label="W mm" value={el.w} onChange={(v) => set({ w: v })} />
        <NumRow label="H mm" value={el.h} onChange={(v) => set({ h: v })} />
      </div>
      <NumRow label="Rotation °" value={el.rotation} step={1} onChange={(v) => set({ rotation: v })} />

      {isTextLike(el) && (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            <Field label="Font">
              <Select
                value={el.font}
                onChange={(e) => set({ font: e.target.value as FontKind })}
              >
                <option value="sans">Sans</option>
                <option value="mono">Mono</option>
              </Select>
            </Field>
            <NumRow label="Size pt" value={el.size_pt} onChange={(v) => set({ size_pt: v })} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Field label="Weight">
              <Select
                value={el.weight}
                onChange={(e) => set({ weight: num(e.target.value, 400) as FontWeight })}
              >
                {WEIGHTS.map((wt) => (
                  <option key={wt} value={wt}>
                    {wt}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Align">
              <Select
                value={el.align}
                onChange={(e) => set({ align: e.target.value as Align })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </Field>
          </div>
          <Field label="Color">
            <Input type="color" value={el.color} onChange={(e) => set({ color: e.target.value })} />
          </Field>
          <label
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--fz-sm)" }}
          >
            <input
              type="checkbox"
              checked={!!el.uppercase}
              onChange={(e) => set({ uppercase: e.target.checked })}
            />
            Uppercase
          </label>
        </>
      )}

      {el.type === "qr" && (
        <>
          <Field label="Foreground">
            <Input type="color" value={el.fg} onChange={(e) => set({ fg: e.target.value })} />
          </Field>
          <Field label="Background">
            <Input type="color" value={el.bg} onChange={(e) => set({ bg: e.target.value })} />
          </Field>
          <NumRow label="Quiet mm" value={el.quiet} onChange={(v) => set({ quiet: v })} />
        </>
      )}

      {el.type === "box" && (
        <>
          <Field label="Fill">
            <Input
              value={el.fill}
              onChange={(e) => set({ fill: e.target.value })}
              placeholder="#hex or none"
            />
          </Field>
          <Field label="Stroke">
            <Input value={el.stroke} onChange={(e) => set({ stroke: e.target.value })} />
          </Field>
          <div style={{ display: "flex", gap: 8 }}>
            <NumRow label="Stroke w mm" value={el.stroke_w} onChange={(v) => set({ stroke_w: v })} />
            <NumRow label="Radius mm" value={el.radius} onChange={(v) => set({ radius: v })} />
          </div>
        </>
      )}

      {el.type === "line" && (
        <>
          <Field label="Stroke">
            <Input value={el.stroke} onChange={(e) => set({ stroke: e.target.value })} />
          </Field>
          <NumRow label="Stroke w mm" value={el.stroke_w} onChange={(v) => set({ stroke_w: v })} />
        </>
      )}

      {el.type === "logo" && (
        <Field label="Source">
          <Select
            value={el.source}
            onChange={(e) => set({ source: e.target.value as "company" | "none" })}
          >
            <option value="company">Company logo</option>
            <option value="none">Monogram</option>
          </Select>
        </Field>
      )}

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Btn size="sm" onClick={() => onZ(el.id, "forward")}>
          Forward
        </Btn>
        <Btn size="sm" onClick={() => onZ(el.id, "back")}>
          Back
        </Btn>
        <Btn size="sm" icon="copy" onClick={() => onDuplicate(el.id)}>
          Duplicate
        </Btn>
        <Btn size="sm" variant="danger" icon="x" onClick={() => onDelete(el.id)}>
          Delete
        </Btn>
      </div>
    </div>
  );
}
