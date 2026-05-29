"use client";

import { useState } from "react";

export interface ToggleProps {
  on?: boolean;
  defaultOn?: boolean;
  onChange?: (next: boolean) => void;
}

export function Toggle({ on, defaultOn = false, onChange }: ToggleProps) {
  const controlled = on !== undefined;
  const [internal, setInternal] = useState(defaultOn);
  const value = controlled ? on : internal;

  const toggle = () => {
    const next = !value;
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <div
      role="switch"
      aria-checked={value}
      tabIndex={0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          toggle();
        }
      }}
      style={{
        width: 34,
        height: 20,
        borderRadius: 11,
        flex: "none",
        cursor: "pointer",
        background: value ? "var(--c-accent)" : "var(--c-line-strong)",
        position: "relative",
        transition: "background .15s",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: value ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .15s",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
        }}
      />
    </div>
  );
}
