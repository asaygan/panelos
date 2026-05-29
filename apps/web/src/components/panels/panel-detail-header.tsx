"use client";

import type { Panel } from "@/lib/api/types";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Badge } from "@/components/primitives/badge";
import { Btn } from "@/components/primitives/button";
import { Icon } from "@/components/icons/icon";

export interface PanelDetailHeaderProps {
  panel: Panel;
  onLabel: () => void;
  onNewRevision: () => void;
}

export function PanelDetailHeader({ panel, onLabel, onNewRevision }: PanelDetailHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="mono"
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#fff",
              background: "var(--c-ink)",
              padding: "3px 8px",
              borderRadius: 5,
              whiteSpace: "nowrap",
            }}
          >
            {panel.tag}
          </span>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 720, letterSpacing: "-.02em" }}>
            {panel.name}
          </h1>
          <StatusBadge status={panel.status} />
          {panel.issues > 0 && (
            <Badge tone="fault" dot>
              {panel.issues} open issue
            </Badge>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 7,
            fontSize: "var(--fz-sm)",
            color: "var(--c-ink-3)",
            flexWrap: "wrap",
          }}
        >
          <span className="mono">{panel.serial}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="map-pin" size={12} />
            {panel.loc} · {panel.area}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="zap" size={12} />
            {panel.volt} {panel.phase} · {panel.amp}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="git-branch" size={12} />
            Rev {panel.rev}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn size="sm" icon="qr-code" onClick={onLabel}>
          Label
        </Btn>
        <Btn size="sm" icon="download">
          Export
        </Btn>
        <Btn size="sm" icon="pencil">
          Edit
        </Btn>
        <Btn size="sm" variant="primary" icon="git-branch" onClick={onNewRevision}>
          New revision
        </Btn>
      </div>
    </div>
  );
}
