"use client";

import { Badge } from "@/components/primitives/badge";
import { Btn } from "@/components/primitives/button";
import { Icon } from "@/components/icons/icon";

const INTEGRATIONS: [string, string, boolean][] = [
  ["AutoCAD Electrical", "Sync schematics & title blocks", true],
  ["EPLAN", "Import projects and BOMs", true],
  ["SAP PM", "Push asset records to maintenance", false],
  ["Microsoft Entra ID", "SSO / SCIM provisioning", true],
];

export function IntegrationsList() {
  return (
    <div>
      <div className="card-head">
        <span className="card-title">Integrations</span>
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {INTEGRATIONS.map(([name, desc, on]) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 11,
              border: "1px solid var(--c-line)",
              borderRadius: "var(--r-sm)",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "var(--c-surface-3)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="box" size={15} style={{ color: "var(--c-ink-3)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--fz)", fontWeight: 600 }}>{name}</div>
              <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{desc}</div>
            </div>
            {on ? (
              <Badge tone="ok" dot>
                Connected
              </Badge>
            ) : (
              <Btn size="sm">Connect</Btn>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
