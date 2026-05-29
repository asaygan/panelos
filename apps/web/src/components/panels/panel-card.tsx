import type { Panel } from "@/lib/api/types";
import { Card } from "@/components/primitives/card";
import { StatusBadge } from "@/components/primitives/status-badge";

export function PanelCard({ panel }: { panel: Panel }) {
  return (
    <Card style={{ padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="strong mono">{panel.tag}</span>
        <StatusBadge status={panel.status} />
      </div>
      <div style={{ marginTop: 6, fontSize: "var(--fz-sm)", color: "var(--c-ink-3)" }}>{panel.name}</div>
      <div className="mono" style={{ marginTop: 4, fontSize: 11, color: "var(--c-ink-4)" }}>
        {panel.serial}
      </div>
    </Card>
  );
}
