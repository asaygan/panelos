"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import type { Row } from "./model";

type AddRow = Extract<Row, { type: "add" }>;

interface Props {
  row: AddRow;
  onStart: (parentKey: string) => void;
  onCancel: () => void;
  /** Resolves true when the node was created. */
  onSubmit: (row: AddRow, name: string) => Promise<boolean>;
}

/**
 * Inline "add child" row at the end of a node's children.
 * Enter creates, Shift+Enter creates and keeps the input for the next one, Esc cancels.
 */
export const QuickAdd = React.memo(function QuickAdd({ row, onStart, onCancel, onSubmit }: Props) {
  const t = useTranslations("panels.quickAdd");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const indent = { paddingLeft: (row.level - 1) * 20 + 36 };
  const label = t(row.addKind);
  const hint = row.hint ? t(row.addKind === "group" ? "emptyGroup" : "emptyPanel") : null;

  const submit = async (keepOpen: boolean) => {
    const value = name.trim();
    if (!value || busy) return;
    setBusy(true);
    const ok = await onSubmit(row, value);
    setBusy(false);
    if (!ok) return inputRef.current?.focus();
    if (keepOpen) {
      setName("");
      inputRef.current?.focus();
    } else {
      onCancel();
    }
  };

  if (!row.active) {
    return (
      <div role="none" className="flex min-h-8 items-center gap-3 pr-2" style={indent}>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onStart(row.parentKey)}
          className="inline-flex h-7 items-center gap-1.5 rounded px-1.5 text-sm text-subtle hover:bg-surface-2 hover:text-primary [&_svg]:size-3.5"
        >
          <Plus aria-hidden />
          {label}
        </button>
        {hint && <span className="truncate text-xs text-subtle">{hint}</span>}
      </div>
    );
  }

  return (
    <div role="none" className="py-1 pr-2" style={indent}>
      <Input
        ref={inputRef}
        autoFocus
        value={name}
        disabled={busy}
        aria-label={label}
        placeholder={t(`placeholder.${row.addKind}`)}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => !name.trim() && !busy && onCancel()}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter") {
            e.preventDefault();
            void submit(e.shiftKey);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        className="h-8 max-w-sm text-sm"
      />
      <p className="mt-1 hidden text-2xs text-subtle sm:block">{t("keys")}</p>
    </div>
  );
});
