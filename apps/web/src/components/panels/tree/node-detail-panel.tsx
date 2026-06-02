"use client";

import { Empty } from "@/components/primitives/empty";
import type { NodeRef } from "./selection";
import type { Panel, PanelSetNode, Section } from "@/lib/api/types";

export interface NodeDetailPanelProps {
  selected: NodeRef | null;
  sets: PanelSetNode[];
  unassigned: Panel[];
}

/** Right-pane detail editor — driven by the tree's selection.
 *
 * Phase 2 stub: shows what's selected so we can verify the split-pane wiring.
 * Phase 4 will replace each branch with a real editor (set/panel/section).
 */
export function NodeDetailPanel({ selected, sets, unassigned }: NodeDetailPanelProps) {
  if (selected == null) {
    return (
      <Empty
        icon="layout-grid"
        title="Select a node"
        sub="Pick a panel set, panel, or section on the left to edit it here."
      />
    );
  }

  const allPanels: Panel[] = [...sets.flatMap((s) => s.panels), ...unassigned];

  if (selected.kind === "set") {
    const s = sets.find((x) => x.id === selected.id);
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: "var(--c-ink-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Panel set
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{s?.name ?? "—"}</div>
        <div style={{ marginTop: 4, color: "var(--c-ink-3)", fontSize: 12 }}>
          {s?.code ?? "no code"} · {s?.panels.length ?? 0} panels
        </div>
      </div>
    );
  }
  if (selected.kind === "panel") {
    const p = allPanels.find((x) => x.id === selected.id);
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, color: "var(--c-ink-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Panel
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{p?.tag ?? "—"}</div>
        <div style={{ marginTop: 4, color: "var(--c-ink-3)", fontSize: 12 }}>{p?.name}</div>
      </div>
    );
  }
  // section
  const allSections: Section[] = allPanels.flatMap((p) => p.sections ?? []);
  const sec = allSections.find((x) => x.id === selected.id);
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 11, color: "var(--c-ink-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
        Section
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{sec?.name ?? "—"}</div>
      <div style={{ marginTop: 4, color: "var(--c-ink-3)", fontSize: 12 }}>{sec?.section_type}</div>
    </div>
  );
}
