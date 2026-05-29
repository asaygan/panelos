import type { ReactNode } from "react";

export function Page({ children, pad = true }: { children: ReactNode; pad?: boolean }) {
  return (
    <div style={{ flex: 1, overflow: "auto", background: "var(--c-canvas)" }}>
      <div style={{ padding: pad ? 16 : 0, minHeight: "100%" }}>{children}</div>
    </div>
  );
}
