"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/icon";
import type { IconName } from "@/components/icons/icon";

export interface InlineAddRowProps {
  /** Label when the row is idle (e.g. "Add Panel" / "Add Section"). */
  label: string;
  /** Icon shown to match the node kind (e.g. "zap" for panels). */
  icon: IconName;
  /** Left padding to align with sibling rows at this indent level. */
  indent: number;
  /** Placeholder inside the inline input. */
  placeholder?: string;
  /** Create handler. Resolve with the new node's id (or void). */
  onCreate: (name: string) => Promise<unknown>;
}

/**
 * ClickUp-style inline quick-add. Click to open an input; Enter saves;
 * Esc cancels; Shift+Enter saves and immediately re-opens a fresh input
 * for rapid runs (Pump-1 ⏎ Pump-2 ⏎ …).
 */
export function InlineAddRow({ label, icon, indent, placeholder, onCreate }: InlineAddRowProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const reset = () => {
    setValue("");
    setOpen(false);
  };

  const submit = async (continueRun: boolean) => {
    const name = value.trim();
    if (!name) {
      reset();
      return;
    }
    setPending(true);
    try {
      await onCreate(name);
      setValue("");
      if (!continueRun) setOpen(false);
    } catch {
      // surface via toast/empty state; keep the input open with the typed value
    } finally {
      setPending(false);
      if (continueRun) ref.current?.focus();
    }
  };

  if (!open) {
    return (
      <div
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          paddingLeft: indent,
          borderBottom: "1px solid var(--c-line)",
          cursor: "pointer",
          color: "var(--c-ink-3)",
        }}
      >
        <Icon name="plus" size={13} style={{ flex: "none" }} />
        <span style={{ fontSize: 12 }}>{label}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        paddingLeft: indent,
        borderBottom: "1px solid var(--c-line)",
        background: "var(--c-surface-2)",
      }}
    >
      <Icon name={icon} size={13} style={{ color: "var(--c-ink-3)", flex: "none" }} />
      <input
        ref={ref}
        value={value}
        disabled={pending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit(e.shiftKey);
          } else if (e.key === "Escape") {
            e.preventDefault();
            reset();
          }
        }}
        onBlur={() => {
          // Cancel on blur with empty value; otherwise save (matches ClickUp).
          if (!value.trim()) reset();
          else void submit(false);
        }}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 12,
          color: "var(--c-ink)",
          padding: 0,
        }}
      />
      <span style={{ fontSize: 10, color: "var(--c-ink-4)" }}>
        {pending ? "saving…" : "Enter to save · Shift+Enter for next · Esc to cancel"}
      </span>
    </div>
  );
}
