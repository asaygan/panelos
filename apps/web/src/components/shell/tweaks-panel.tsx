"use client";

import { useState } from "react";
import { useTweaks, type Accent, type Density, type NavStyle, type Theme } from "@/hooks/use-tweaks";

const ACCENT_COLORS: [Accent, string][] = [
  ["blue", "#3b82f6"],
  ["cyan", "#0ea5e9"],
  ["indigo", "#6366f1"],
  ["steel", "#5b6675"],
];

export function TweaksPanel() {
  const [open, setOpen] = useState(false);
  const [tweaks, setTweak] = useTweaks();

  if (process.env.NEXT_PUBLIC_SHOW_TWEAKS !== "1") return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "var(--c-ink)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "var(--shadow-md)",
          zIndex: 100,
        }}
      >
        ⚙
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: 240,
        background: "#1a1d22",
        color: "#c9ced6",
        border: "1px solid #2a2f36",
        borderRadius: 10,
        padding: 12,
        zIndex: 100,
        boxShadow: "var(--shadow-pop)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 12 }}>Tweaks</span>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#c9ced6", cursor: "pointer" }}>
          ×
        </button>
      </div>
      <Section label="Theme" />
      <Radio<Theme>
        label="Mode"
        value={tweaks.theme}
        options={["light", "dark"]}
        onChange={(v) => setTweak("theme", v)}
      />
      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0" }}>
        <span style={{ fontSize: 12 }}>Accent</span>
        <div style={{ display: "flex", gap: 6 }}>
          {ACCENT_COLORS.map(([k, c]) => (
            <button
              key={k}
              onClick={() => setTweak("accent", k)}
              title={k}
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                background: c,
                border: "none",
                cursor: "pointer",
                boxShadow:
                  tweaks.accent === k
                    ? `0 0 0 2px #fff, 0 0 0 4px ${c}`
                    : "inset 0 0 0 1px rgba(255,255,255,.25)",
              }}
            />
          ))}
        </div>
      </div>
      <Section label="Layout" />
      <Radio<Density>
        label="Density"
        value={tweaks.density}
        options={["compact", "default", "comfortable"]}
        onChange={(v) => setTweak("density", v)}
      />
      <Radio<NavStyle>
        label="Navigation"
        value={tweaks.navStyle}
        options={["sidebar", "topbar"]}
        onChange={(v) => setTweak("navStyle", v)}
      />
    </div>
  );
}

function Section({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: ".08em",
        color: "#76818e",
        marginTop: 8,
        marginBottom: 4,
      }}
    >
      {label}
    </div>
  );
}

function Radio<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", alignItems: "center" }}>
      <span style={{ fontSize: 12 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            style={{
              fontSize: 10,
              padding: "3px 7px",
              borderRadius: 4,
              border: "1px solid #2a2f36",
              background: value === o ? "#3b82f6" : "transparent",
              color: value === o ? "#fff" : "#c9ced6",
              cursor: "pointer",
            }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
