"use client";

import { Btn } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import type { Panel } from "@/lib/api/types";
import type { LabelLayout } from "@/lib/api/label-layout";

export interface EditorToolbarProps {
  name: string;
  onName: (v: string) => void;
  layout: LabelLayout;
  panels: Panel[];
  samplePanelId: string;
  onSamplePanel: (id: string) => void;
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  isDefault: boolean;
  onToggleDefault: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

export function EditorToolbar({
  name,
  onName,
  layout,
  panels,
  samplePanelId,
  onSamplePanel,
  scale,
  onZoomIn,
  onZoomOut,
  onFit,
  isDefault,
  onToggleDefault,
  onSave,
  saving,
  saved,
}: EditorToolbarProps) {
  const concept = layout.background.kind === "engraved" ? "Engraved" : "Plain";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderBottom: "1px solid var(--c-line)",
        background: "var(--c-surface)",
        flexWrap: "wrap",
      }}
    >
      <Input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Template name"
        style={{ width: 200 }}
      />
      <span
        className="mono"
        style={{ fontSize: 11, color: "var(--c-ink-3)" }}
      >
        {concept} · {layout.size_mm.w}×{layout.size_mm.h}mm · {layout.orientation}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Btn size="sm" icon="zoom-out" onClick={onZoomOut} aria-label="Zoom out" />
        <span className="mono" style={{ fontSize: 11, width: 38, textAlign: "center" }}>
          {Math.round(scale * 10)}%
        </span>
        <Btn size="sm" icon="zoom-in" onClick={onZoomIn} aria-label="Zoom in" />
        <Btn size="sm" icon="maximize" onClick={onFit} aria-label="Fit" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--c-ink-3)" }}>Preview</span>
        <Select
          value={samplePanelId}
          onChange={(e) => onSamplePanel(e.target.value)}
          style={{ width: 180 }}
        >
          <option value="">Sample data</option>
          {panels.map((p) => (
            <option key={p.id} value={p.id}>
              {p.tag} — {p.name}
            </option>
          ))}
        </Select>
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: "var(--fz-sm)",
          marginLeft: "auto",
        }}
      >
        <input type="checkbox" checked={isDefault} onChange={onToggleDefault} />
        Default
      </label>
      {saved && <span style={{ fontSize: 11, color: "var(--c-ok)" }}>Saved</span>}
      <Btn variant="primary" icon="check" onClick={onSave} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </Btn>
    </div>
  );
}
