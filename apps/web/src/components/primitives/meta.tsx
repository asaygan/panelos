import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface MetaProps {
  label: ReactNode;
  value: ReactNode;
  mono?: boolean;
}

export function Meta({ label, value, mono }: MetaProps) {
  return (
    <div>
      <div className="label-cap" style={{ marginBottom: 3 }}>
        {label}
      </div>
      <div
        className={cn(mono && "mono")}
        style={{ fontSize: 13, fontWeight: 540, color: "var(--c-ink)" }}
      >
        {value}
      </div>
    </div>
  );
}
