"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Field, Label } from "@/components/ui/field";
import { Switch } from "@/components/ui/controls";

const fmt = (v: number) => String(Math.round(v * 100) / 100);

/** Numeric input that tolerates in-progress typing ("1.", "-") and commits valid numbers live. */
export function NumField({
  label,
  value,
  onChange,
  step = 0.5,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  const [text, setText] = React.useState(fmt(value));
  const focused = React.useRef(false);
  React.useEffect(() => {
    if (!focused.current) setText(fmt(value));
  }, [value]);

  return (
    <Field label={label}>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(fmt(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(n)) onChange(min !== undefined ? Math.max(min, n) : n);
        }}
      />
    </Field>
  );
}

function toHex6(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) return v.slice(0, 7);
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  return "#000000";
}

/** Colour swatch + hex text (so alpha like #ffffff24 and "none" stay editable). */
export function ColorField({
  label,
  value,
  onChange,
  pickerLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  pickerLabel: string;
}) {
  const id = React.useId();
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          aria-label={`${label}: ${pickerLabel}`}
          value={toHex6(value)}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded border border-border-strong bg-surface p-1"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="min-w-0 font-mono text-sm"
        />
      </div>
    </div>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function Section({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-b border-border p-4 last:border-b-0">
      <h3 className="text-xs font-medium uppercase tracking-wide text-subtle">{title}</h3>
      {children}
    </section>
  );
}
