"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { SchematicViewer } from "@/components/pdf/schematic-viewer";
import { Badge } from "@/components/primitives/badge";
import { Icon } from "@/components/icons/icon";
import { Empty } from "@/components/primitives/empty";
import { usePanel, usePanelSheets } from "@/lib/query/hooks";

export default function PanelSchematicsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: panel, isLoading, isError } = usePanel(id);
  const { data: sheets = [] } = usePanelSheets(id);

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <Empty icon="file-text" title="Loading schematics…" />
      </div>
    );
  }
  if (isError || !panel) notFound();

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
        <span style={{ fontWeight: 640 }}>{panel.name} — Schematic Set</span>
        <Badge tone="accent">Rev {panel.rev}</Badge>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--c-ink-3)" }} className="mono">
          {sheets.length} sheets
        </span>
      </div>
      {sheets.length === 0 ? (
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <Empty icon="file-text" title="No schematics attached" sub="Upload sheets from the panel detail view." />
        </div>
      ) : (
        <SchematicViewer panelId={id} panel={panel} embedded />
      )}
    </div>
  );
}
