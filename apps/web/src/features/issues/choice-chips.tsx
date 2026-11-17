"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface Choice<T extends string> {
  value: T;
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Tailwind background class for the leading dot (semantic token). */
  dot?: string;
}

/**
 * Large exclusive touch targets (radio semantics) for the few choices that
 * matter most in a form: severity, maintenance result.
 */
export function ChoiceChips<T extends string>({
  value,
  onChange,
  options,
  "aria-label": ariaLabel,
  className,
}: {
  value: T | undefined;
  onChange: (value: T) => void;
  options: Choice<T>[];
  "aria-label": string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "grid grid-cols-2 gap-2",
        options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4",
        className,
      )}
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-14 flex-col items-start justify-center gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              selected
                ? "border-primary bg-primary-soft ring-1 ring-primary"
                : "border-border-strong bg-surface hover:bg-surface-2",
            )}
          >
            <span className="flex items-center gap-2 text-base font-semibold">
              {o.dot && <span className={cn("size-2 rounded-full", o.dot)} aria-hidden />}
              {o.label}
            </span>
            {o.hint && <span className="text-xs leading-snug text-muted">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
