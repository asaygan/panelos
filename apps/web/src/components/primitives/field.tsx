import type { ReactNode } from "react";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label style={{ display: "block" }}>
      <div className="label-cap" style={{ marginBottom: 5 }}>
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: "var(--fz-xs)", color: "var(--c-ink-4)", marginTop: 4 }}>{hint}</div>
      )}
    </label>
  );
}
