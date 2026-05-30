"use client";

import { useMemo, useState } from "react";
import { Page } from "@/components/primitives/page";
import { Field } from "@/components/primitives/field";
import { Select } from "@/components/primitives/select";
import { Btn } from "@/components/primitives/button";
import { useToast } from "@/components/primitives/toast";
import { LabelSvg } from "@/components/labels/label-svg";
import { LabelBatchList } from "@/components/labels/label-batch-list";
import { buildLabelData } from "@/lib/api/label-layout";
import { demoCompany, demoLabelTemplates, demoPanels } from "@/lib/demo/data";

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://panelos.app";

export default function DemoLabelsPage() {
  const toast = useToast();
  const panels = demoPanels;
  const templates = demoLabelTemplates;

  const [panelId, setPanelId] = useState(panels[0]!.id);
  const [templateId, setTemplateId] = useState((templates.find((t) => t.is_default) ?? templates[0]!).id);
  const [batch, setBatch] = useState<string[]>([]);

  const panel = panels.find((p) => p.id === panelId) ?? panels[0];
  const template = templates.find((t) => t.id === templateId) ?? templates[0]!;
  const layout = template.layout;
  const concept = layout.background.kind === "engraved" ? "engraved" : "plain";

  const data = useMemo(
    () => buildLabelData(panel, demoCompany, { appUrl: APP_URL, logoUrl: null }),
    [panel],
  );

  return (
    <Page pad={false}>
      <div style={{ display: "grid", gridTemplateColumns: "248px 1fr 280px", height: "calc(100vh - var(--topbar-h) - 28px)" }}>
        <div style={{ borderRight: "1px solid var(--c-line)", background: "var(--c-surface)", overflow: "auto", padding: 14 }}>
          <div className="label-cap" style={{ marginBottom: 10 }}>
            Label design
          </div>
          <Field label="Template">
            <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.is_default ? " (default)" : ""}
                </option>
              ))}
            </Select>
          </Field>
          <div style={{ height: 14 }} />
          <Field label="Source panel">
            <Select value={panelId} onChange={(e) => setPanelId(e.target.value)}>
              {panels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.tag} — {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <div style={{ height: 16 }} />
          <div className="label-cap" style={{ marginBottom: 8 }}>
            Layout
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--c-ink-3)", lineHeight: 1.7 }}>
            {layout.size_mm.w}×{layout.size_mm.h} mm · {layout.orientation}
            <br />
            {concept} · {layout.elements.length} elements
          </div>
        </div>

        <div
          style={{
            overflow: "auto",
            background: "var(--c-surface-3)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            padding: 28,
          }}
        >
          {panel && (
            <div style={{ boxShadow: "0 6px 24px rgba(0,0,0,.18)", borderRadius: 6 }}>
              <LabelSvg layout={layout} data={data} scale={5} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <Btn icon="copy" onClick={() => toast.success("Demo mode — export disabled.")}>
              SVG
            </Btn>
            <Btn icon="download" onClick={() => toast.success("Demo mode — export disabled.")}>
              Export PNG
            </Btn>
            <Btn variant="primary" icon="printer" onClick={() => toast.success("Demo mode — printing disabled.")}>
              Print {batch.length || 1} label{batch.length === 1 ? "" : "s"}
            </Btn>
          </div>
          <div style={{ fontSize: 11, color: "var(--c-ink-3)" }} className="mono">
            {layout.size_mm.w}×{layout.size_mm.h} mm · 300 dpi ·{" "}
            {concept === "engraved" ? "rotary-engrave ready" : "B/W thermal"}
          </div>
        </div>

        <div style={{ borderLeft: "1px solid var(--c-line)", background: "var(--c-surface)", overflow: "auto", padding: 14 }}>
          <LabelBatchList
            panels={batch.map((id) => panels.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p)}
            onRemove={(id) => setBatch((b) => b.filter((x) => x !== id))}
            onAdd={() => setBatch((b) => (panelId && !b.includes(panelId) ? [...b, panelId] : b))}
          />
        </div>
      </div>
    </Page>
  );
}
