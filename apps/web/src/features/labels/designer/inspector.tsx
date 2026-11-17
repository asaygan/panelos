"use client";

import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Segmented, Select } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  BINDINGS,
  SIZE_PRESETS,
  orientationOf,
  type Align,
  type Binding,
  type FieldElement,
  type FontKind,
  type FontWeight,
  type LabelElement,
  type LabelLayout,
  type TextElement,
} from "@/lib/api/label-layout";
import { cn } from "@/lib/utils/cn";
import { ELEMENT_ICONS, useElementName } from "./element-meta";
import { ColorField, NumField, Section, ToggleField } from "./inspector-fields";

export interface InspectorProps {
  layout: LabelLayout;
  selected: LabelElement | null;
  onSelect: (id: string | null) => void;
  onChangeElement: (el: LabelElement, key?: string) => void;
  onChangeLayout: (layout: LabelLayout, key?: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onZ: (id: string, dir: "forward" | "back") => void;
}

const WEIGHTS: FontWeight[] = [400, 500, 600, 700, 800];

const isTextLike = (el: LabelElement): el is FieldElement | TextElement =>
  el.type === "field" || el.type === "text";

export function Inspector(props: InspectorProps) {
  return props.selected ? (
    <ElementPanel {...props} selected={props.selected} />
  ) : (
    <DocumentPanel {...props} />
  );
}

// ── Nothing selected: the label itself + its layers ─────────────────────────────
function DocumentPanel({ layout, onSelect, onChangeLayout, onChangeElement }: InspectorProps) {
  const t = useTranslations("labels");
  const name = useElementName();
  const { w, h } = layout.size_mm;
  const presetValue = SIZE_PRESETS.some((p) => `${p.w}x${p.h}` === `${w}x${h}`) ? `${w}x${h}` : "custom";
  const setSize = (nw: number, nh: number) =>
    onChangeLayout(
      { ...layout, size_mm: { w: nw, h: nh }, orientation: orientationOf({ w: nw, h: nh }) },
      "size",
    );
  const layers = [...layout.elements].sort((a, b) => b.z - a.z);

  return (
    <div>
      <Section title={t("inspector.document")}>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">{t("inspector.orientation")}</span>
          <Segmented<"landscape" | "portrait">
            aria-label={t("inspector.orientation")}
            value={layout.orientation}
            onChange={(o) =>
              o !== layout.orientation &&
              onChangeLayout({ ...layout, orientation: o, size_mm: { w: h, h: w } })
            }
            options={[
              { value: "landscape", label: t("orientation.landscape") },
              { value: "portrait", label: t("orientation.portrait") },
            ]}
            className="self-start"
          />
        </div>
        <Field label={t("inspector.sizePreset")}>
          <Select
            value={presetValue}
            onValueChange={(v) => {
              const p = SIZE_PRESETS.find((x) => `${x.w}x${x.h}` === v);
              if (p) setSize(p.w, p.h);
            }}
            options={[
              ...SIZE_PRESETS.map((p) => ({ value: `${p.w}x${p.h}`, label: `${p.label} mm` })),
              { value: "custom", label: t("inspector.custom"), disabled: true },
            ]}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <NumField label={t("inspector.widthMm")} value={w} step={1} min={10} onChange={(v) => setSize(v, h)} />
          <NumField label={t("inspector.heightMm")} value={h} step={1} min={10} onChange={(v) => setSize(w, v)} />
        </div>
      </Section>

      <Section title={t("inspector.background")}>
        <Field label={t("inspector.backgroundKind")}>
          <Select
            value={layout.background.kind}
            onValueChange={(kind) =>
              onChangeLayout({
                ...layout,
                background: {
                  ...layout.background,
                  kind: kind as "engraved" | "plain",
                  fill: kind === "engraved" ? "#1f242b" : "#ffffff",
                },
              })
            }
            options={[
              { value: "engraved", label: t("inspector.engraved") },
              { value: "plain", label: t("inspector.plain") },
            ]}
          />
        </Field>
        <ColorField
          label={t("inspector.fill")}
          pickerLabel={t("inspector.pickColor")}
          value={layout.background.fill}
          onChange={(fill) =>
            onChangeLayout({ ...layout, background: { ...layout.background, fill } }, "bgfill")
          }
        />
        <NumField
          label={t("inspector.radiusMm")}
          value={layout.background.radius_mm}
          min={0}
          onChange={(v) =>
            onChangeLayout({ ...layout, background: { ...layout.background, radius_mm: v } }, "bgradius")
          }
        />
      </Section>

      <Section title={t("inspector.grid")}>
        <NumField
          label={t("inspector.gridMm")}
          value={layout.grid_mm}
          min={0}
          onChange={(v) => onChangeLayout({ ...layout, grid_mm: v }, "grid")}
        />
        <ToggleField
          label={t("inspector.snap")}
          checked={layout.snap !== false}
          onChange={(snap) => onChangeLayout({ ...layout, snap })}
        />
      </Section>

      <Section title={t("inspector.layers", { count: layers.length })}>
        {layers.length === 0 ? (
          <p className="text-sm text-muted">{t("inspector.noLayers")}</p>
        ) : (
          <ul className="-mx-1 flex flex-col">
            {layers.map((el) => (
              <li key={el.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelect(el.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-subtle",
                    !el.visible && "opacity-50",
                  )}
                >
                  {ELEMENT_ICONS[el.type]}
                  <span className="truncate">{name(el)}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={el.visible ? t("inspector.hide") : t("inspector.show")}
                  aria-pressed={!el.visible}
                  onClick={() => onChangeElement({ ...el, visible: !el.visible })}
                >
                  {el.visible ? <Eye /> : <EyeOff />}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ── An element is selected ───────────────────────────────────────────────────────
function ElementPanel({
  selected: el,
  layout,
  onChangeElement,
  onDelete,
  onDuplicate,
  onZ,
}: InspectorProps & { selected: LabelElement }) {
  const t = useTranslations("labels");
  const name = useElementName();
  const set = (patch: Partial<LabelElement>, key?: string) =>
    onChangeElement({ ...el, ...patch } as LabelElement, key ? `${key}:${el.id}` : undefined);
  const sorted = [...layout.elements].sort((a, b) => a.z - b.z);
  const rank = sorted.findIndex((e) => e.id === el.id);
  const pick = t("inspector.pickColor");

  return (
    <div>
      <Section title={`${t(`elements.${el.type}`)} · ${name(el)}`}>
        {el.type === "field" && (
          <Field label={t("inspector.binding")}>
            <Select
              value={el.binding}
              onValueChange={(v) => set({ binding: v as Binding })}
              options={BINDINGS.map((b) => ({ value: b, label: t(`bindings.${b}`) }))}
            />
          </Field>
        )}
        {el.type === "text" && (
          <Field label={t("inspector.text")}>
            <Input value={el.text} onChange={(e) => set({ text: e.target.value }, "text")} />
          </Field>
        )}
        {el.type === "logo" && (
          <Field label={t("inspector.logoSource")}>
            <Select
              value={el.source}
              onValueChange={(v) => set({ source: v as "company" | "none" })}
              options={[
                { value: "company", label: t("inspector.logoCompany") },
                { value: "none", label: t("inspector.logoMonogram") },
              ]}
            />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onZ(el.id, "forward")}
            disabled={rank === sorted.length - 1}
          >
            <ArrowUp />
            {t("inspector.forward")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onZ(el.id, "back")} disabled={rank <= 0}>
            <ArrowDown />
            {t("inspector.back")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onDuplicate(el.id)}>
            <Copy />
            {t("inspector.duplicate")}
          </Button>
          <Button variant="danger-ghost" size="sm" onClick={() => onDelete(el.id)}>
            <Trash2 />
            {t("inspector.delete")}
          </Button>
        </div>
      </Section>

      <Section title={t("inspector.position")}>
        <div className="grid grid-cols-2 gap-3">
          <NumField label={t("inspector.x")} value={el.x} onChange={(v) => set({ x: v }, "x")} />
          <NumField label={t("inspector.y")} value={el.y} onChange={(v) => set({ y: v }, "y")} />
          <NumField label={t("inspector.w")} value={el.w} min={0} onChange={(v) => set({ w: v }, "w")} />
          <NumField label={t("inspector.h")} value={el.h} min={0} onChange={(v) => set({ h: v }, "h")} />
          <NumField label={t("inspector.rotation")} value={el.rotation} step={1} onChange={(v) => set({ rotation: v }, "rot")} />
        </div>
        <ToggleField label={t("inspector.visible")} checked={el.visible} onChange={(v) => set({ visible: v })} />
      </Section>

      {isTextLike(el) && (
        <Section title={t("inspector.typography")}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("inspector.font")}>
              <Select
                value={el.font}
                onValueChange={(v) => set({ font: v as FontKind })}
                options={[
                  { value: "sans", label: t("inspector.fontSans") },
                  { value: "mono", label: t("inspector.fontMono") },
                ]}
              />
            </Field>
            <NumField label={t("inspector.sizePt")} value={el.size_pt} min={1} onChange={(v) => set({ size_pt: v }, "size")} />
            <Field label={t("inspector.weight")}>
              <Select
                value={String(el.weight)}
                onValueChange={(v) => set({ weight: Number(v) as FontWeight })}
                options={WEIGHTS.map((wt) => ({ value: String(wt), label: String(wt) }))}
              />
            </Field>
            <Field label={t("inspector.align")}>
              <Select
                value={el.align}
                onValueChange={(v) => set({ align: v as Align })}
                options={[
                  { value: "left", label: t("inspector.alignLeft") },
                  { value: "center", label: t("inspector.alignCenter") },
                  { value: "right", label: t("inspector.alignRight") },
                ]}
              />
            </Field>
          </div>
          <ColorField label={t("inspector.color")} pickerLabel={pick} value={el.color} onChange={(v) => set({ color: v }, "color")} />
          <ToggleField label={t("inspector.uppercase")} checked={!!el.uppercase} onChange={(v) => set({ uppercase: v })} />
        </Section>
      )}

      {el.type === "qr" && (
        <Section title={t("inspector.qr")}>
          <p className="text-xs text-subtle">{t("inspector.qrHint")}</p>
          <ColorField label={t("inspector.foreground")} pickerLabel={pick} value={el.fg} onChange={(v) => set({ fg: v }, "fg")} />
          <ColorField label={t("inspector.backgroundColor")} pickerLabel={pick} value={el.bg} onChange={(v) => set({ bg: v }, "bg")} />
          <NumField label={t("inspector.quietMm")} value={el.quiet} min={0} onChange={(v) => set({ quiet: v }, "quiet")} />
        </Section>
      )}

      {el.type === "box" && (
        <Section title={t("inspector.box")}>
          <ColorField label={t("inspector.fill")} pickerLabel={pick} value={el.fill} onChange={(v) => set({ fill: v }, "fill")} />
          <ColorField label={t("inspector.stroke")} pickerLabel={pick} value={el.stroke} onChange={(v) => set({ stroke: v }, "stroke")} />
          <div className="grid grid-cols-2 gap-3">
            <NumField label={t("inspector.strokeMm")} value={el.stroke_w} min={0} step={0.05} onChange={(v) => set({ stroke_w: v }, "sw")} />
            <NumField label={t("inspector.radiusMm")} value={el.radius} min={0} onChange={(v) => set({ radius: v }, "radius")} />
          </div>
          <p className="text-xs text-subtle">{t("inspector.noneHint")}</p>
        </Section>
      )}

      {el.type === "line" && (
        <Section title={t("inspector.line")}>
          <ColorField label={t("inspector.stroke")} pickerLabel={pick} value={el.stroke} onChange={(v) => set({ stroke: v }, "stroke")} />
          <NumField label={t("inspector.strokeMm")} value={el.stroke_w} min={0} step={0.05} onChange={(v) => set({ stroke_w: v }, "sw")} />
        </Section>
      )}
    </div>
  );
}
