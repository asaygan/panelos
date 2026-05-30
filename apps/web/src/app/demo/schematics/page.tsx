"use client";

import { useState } from "react";
import { Badge } from "@/components/primitives/badge";
import { Btn } from "@/components/primitives/button";
import { Select } from "@/components/primitives/select";
import { Icon } from "@/components/icons/icon";
import { useToast } from "@/components/primitives/toast";
import { BlueprintPlaceholder } from "@/components/pdf/blueprint-placeholder";
import { demoPanels, demoSheets } from "@/lib/demo/data";

export default function DemoSchematicsPage() {
  const toast = useToast();
  const [panelId, setPanelId] = useState(demoPanels[0]!.id);
  const [activeSheet, setActiveSheet] = useState(demoSheets[2]?.n ?? demoSheets[0]!.n);

  const panel = demoPanels.find((p) => p.id === panelId)!;
  const sheets = demoSheets;
  const sheet = sheets.find((s) => s.n === activeSheet) ?? sheets[0]!;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--c-line)",
          background: "var(--c-surface)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Icon name="file-text" size={16} style={{ color: "var(--c-accent)" }} />
        <Select style={{ width: "auto" }} value={panelId} onChange={(e) => setPanelId(e.target.value)}>
          {demoPanels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.tag} — {p.name}
            </option>
          ))}
        </Select>
        <Badge tone="accent">Rev {panel.rev}</Badge>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }} className="mono">
          <span style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{sheets.length} sheets</span>
          <Btn size="sm" icon="upload" onClick={() => toast.success("Demo mode — uploads disabled.")}>
            Upload sheet
          </Btn>
        </span>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          style={{
            width: 220,
            flex: "none",
            borderRight: "1px solid var(--c-line)",
            background: "var(--c-surface)",
            overflow: "auto",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div className="label-cap" style={{ padding: "2px 4px 6px" }}>
            Sheets
          </div>
          {sheets.map((s) => (
            <button
              key={s.n}
              onClick={() => setActiveSheet(s.n)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 9px",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
                textAlign: "left",
                border: "1px solid var(--c-line)",
                background: activeSheet === s.n ? "var(--c-surface-3)" : "transparent",
                fontWeight: activeSheet === s.n ? 600 : 500,
                fontSize: "var(--fz-sm)",
                color: "var(--c-ink-2)",
              }}
            >
              <span className="mono" style={{ color: "var(--c-ink-3)" }}>
                {s.n}
              </span>
              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {s.title}
              </span>
            </button>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            background: "var(--c-surface-3)",
            display: "grid",
            placeItems: "center",
            padding: 28,
          }}
        >
          <BlueprintPlaceholder
            sheetNumber={sheet.n}
            title={sheet.title}
            rev={panel.rev}
            panelName={panel.name}
            totalSheets={sheets.length}
            width={620}
          />
        </div>
      </div>
    </div>
  );
}
