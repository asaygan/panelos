"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/primitives/badge";
import { Btn } from "@/components/primitives/button";
import { Select } from "@/components/primitives/select";
import { Icon } from "@/components/icons/icon";
import { Empty } from "@/components/primitives/empty";
import { SchematicViewer } from "@/components/pdf/schematic-viewer";
import { UploadSchematicModal } from "@/components/pdf/upload-schematic-modal";
import { usePanels, usePanel, usePanelSheets } from "@/lib/query/hooks";

export default function SchematicsPage() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("panel") ?? "";
  const { data: panels = [] } = usePanels();
  const [panelId, setPanelId] = useState(initial);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (!panelId && panels.length > 0) setPanelId(panels[0]!.id);
  }, [panels, panelId]);

  const { data: panel } = usePanel(panelId);
  const { data: sheets = [] } = usePanelSheets(panelId);

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
          {panels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.tag} — {p.name}
            </option>
          ))}
        </Select>
        {panel && <Badge tone="accent">Rev {panel.rev}</Badge>}
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }} className="mono">
          <span style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{sheets.length} sheets</span>
          <Btn size="sm" icon="upload" onClick={() => setUploadOpen(true)}>
            Upload sheet
          </Btn>
        </span>
      </div>
      {sheets.length === 0 ? (
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Empty
            icon="file-text"
            title="No schematics attached"
            sub="Upload a PDF sheet to start the schematic set."
          />
        </div>
      ) : (
        <SchematicViewer panelId={panelId} panel={panel} embedded />
      )}
      {panelId && (
        <UploadSchematicModal panelId={panelId} open={uploadOpen} onOpenChange={setUploadOpen} />
      )}
    </div>
  );
}
