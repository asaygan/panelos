"use client";

import { Icon, type IconName } from "@/components/icons/icon";

export interface SettingsTab {
  id: string;
  label: string;
  icon: IconName;
}

export const SETTINGS_TABS: SettingsTab[] = [
  { id: "org", label: "Organization", icon: "building" },
  { id: "branding", label: "Branding", icon: "qr-code" },
  { id: "locations", label: "Locations", icon: "map-pin" },
  { id: "integrations", label: "Integrations", icon: "box" },
  { id: "security", label: "Security", icon: "shield" },
];

export function SettingsNav({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {SETTINGS_TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "7px 10px",
            borderRadius: "var(--r-sm)",
            cursor: "pointer",
            background: active === t.id ? "var(--c-surface-3)" : "transparent",
            color: active === t.id ? "var(--c-ink)" : "var(--c-ink-2)",
            fontWeight: active === t.id ? 600 : 500,
            fontSize: "var(--fz)",
            border: "none",
            textAlign: "left",
          }}
        >
          <Icon
            name={t.icon}
            size={15}
            style={{ color: active === t.id ? "var(--c-accent)" : "var(--c-ink-3)" }}
          />
          {t.label}
        </button>
      ))}
    </div>
  );
}
