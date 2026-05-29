"use client";

import type { Location } from "@/lib/api/types";

export interface LocationPickerProps {
  locations: Location[];
  selected: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Multi-select location chips with an "All locations" chip.
 * An empty selection means organization-wide access.
 */
export function LocationPicker({ locations, selected, onChange }: LocationPickerProps) {
  const allOn = selected.length === 0;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <Chip label="All locations" on={allOn} onClick={() => onChange([])} />
      {locations.map((l) => {
        const on = selected.includes(l.id);
        return (
          <Chip
            key={l.id}
            label={`${l.code} · ${l.name.split(" — ")[0] ?? l.name}`}
            on={on}
            onClick={() =>
              onChange(on ? selected.filter((x) => x !== l.id) : [...selected, l.id])
            }
          />
        );
      })}
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: "var(--fz-sm)",
        padding: "4px 9px",
        border: "1px solid " + (on ? "var(--c-accent)" : "var(--c-line-strong)"),
        background: on ? "var(--c-accent-soft)" : "transparent",
        color: on ? "var(--c-accent-ink)" : "var(--c-ink-2)",
        borderRadius: "var(--r-sm)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}
