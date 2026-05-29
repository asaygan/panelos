"use client";

import { useEffect, useMemo, useState } from "react";
import { Page } from "@/components/primitives/page";
import { Field } from "@/components/primitives/field";
import { Select } from "@/components/primitives/select";
import { Btn } from "@/components/primitives/button";
import { LabelSvg } from "@/components/labels/label-svg";
import { LabelBatchList } from "@/components/labels/label-batch-list";
import {
  buildLabelData,
  coerceLayout,
  defaultEngravedLayout,
} from "@/lib/api/label-layout";
import {
  usePanels,
  useCompany,
  useLabelTemplates,
  useRenderLabel,
  useBatchLabels,
} from "@/lib/query/hooks";
import { files } from "@/lib/api/endpoints";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith("/")
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

function download(url: string) {
  if (!url) return;
  const full = url.startsWith("http") ? url : `${API_BASE}${url}`;
  window.open(full, "_blank", "noopener");
}

export default function LabelsPage() {
  const { data: panels = [] } = usePanels();
  const { data: templates = [] } = useLabelTemplates();
  const { data: company } = useCompany();
  const renderLabel = useRenderLabel();
  const batchLabels = useBatchLabels();

  const [panelId, setPanelId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [batch, setBatch] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!panelId && panels.length > 0) setPanelId(panels[0]!.id);
  }, [panels, panelId]);
  useEffect(() => {
    if (!templateId && templates.length > 0) {
      setTemplateId((templates.find((t) => t.is_default) ?? templates[0]!).id);
    }
  }, [templates, templateId]);

  const panel = panels.find((p) => p.id === panelId) ?? panels[0];
  const template = templates.find((t) => t.id === templateId);
  const logoKey =
    company && "logo_key" in company ? (company as { logo_key?: string | null }).logo_key : null;
  const logoUrl = logoKey ? files.serveUrl(logoKey) : null;

  const layout = useMemo(
    () =>
      template
        ? coerceLayout(template.layout_json, template.concept === "plain" ? "plain" : "engraved")
        : defaultEngravedLayout(),
    [template],
  );
  const data = useMemo(
    () => buildLabelData(panel, company, { appUrl: APP_URL, logoUrl }),
    [panel, company, logoUrl],
  );
  const concept = layout.background.kind === "engraved" ? "engraved" : "plain";

  const exportLabel = async (format: "png" | "svg") => {
    if (!panel) return;
    setError(null);
    try {
      const res = await renderLabel.mutateAsync({
        panel_id: panel.id,
        template: concept,
        format,
        size: template?.size_mm ?? "90x50",
        template_id: templateId || undefined,
      });
      download(format === "svg" ? res.svg_url ?? res.png_url ?? "" : res.png_url ?? "");
    } catch {
      setError("Could not render the label.");
    }
  };

  const printBatch = async () => {
    const ids = batch.length ? batch : panel ? [panel.id] : [];
    if (ids.length === 0) return;
    setError(null);
    try {
      const res = await batchLabels.mutateAsync({ panelIds: ids, template: concept });
      download(res.pdf_url ?? "");
    } catch {
      setError("Could not generate the batch.");
    }
  };

  return (
    <Page pad={false}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "248px 1fr 280px",
          height: "calc(100vh - var(--topbar-h))",
        }}
      >
        <div
          style={{
            borderRight: "1px solid var(--c-line)",
            background: "var(--c-surface)",
            overflow: "auto",
            padding: 14,
          }}
        >
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
            <Btn icon="copy" onClick={() => exportLabel("svg")} disabled={renderLabel.isPending}>
              SVG
            </Btn>
            <Btn icon="download" onClick={() => exportLabel("png")} disabled={renderLabel.isPending}>
              {renderLabel.isPending ? "Rendering…" : "Export PNG"}
            </Btn>
            <Btn variant="primary" icon="printer" onClick={printBatch} disabled={batchLabels.isPending}>
              {batchLabels.isPending
                ? "Building…"
                : `Print ${batch.length || 1} label${batch.length === 1 ? "" : "s"}`}
            </Btn>
          </div>
          {error && <div style={{ fontSize: 12, color: "var(--c-fault)" }}>{error}</div>}
          <div style={{ fontSize: 11, color: "var(--c-ink-3)" }} className="mono">
            {layout.size_mm.w}×{layout.size_mm.h} mm · 300 dpi ·{" "}
            {concept === "engraved" ? "rotary-engrave ready" : "B/W thermal"}
          </div>
        </div>

        <div
          style={{
            borderLeft: "1px solid var(--c-line)",
            background: "var(--c-surface)",
            overflow: "auto",
            padding: 14,
          }}
        >
          <LabelBatchList
            panels={batch
              .map((id) => panels.find((p) => p.id === id))
              .filter((p): p is NonNullable<typeof p> => !!p)}
            onRemove={(id) => setBatch((b) => b.filter((x) => x !== id))}
            onAdd={() => setBatch((b) => (panelId && !b.includes(panelId) ? [...b, panelId] : b))}
          />
        </div>
      </div>
    </Page>
  );
}
