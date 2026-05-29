"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Select } from "@/components/primitives/select";
import { LabelSvg } from "./label-svg";
import { useRenderLabel, useLabelTemplates, useCompany } from "@/lib/query/hooks";
import { files } from "@/lib/api/endpoints";
import {
  buildLabelData,
  coerceLayout,
  defaultEngravedLayout,
} from "@/lib/api/label-layout";
import type { Panel } from "@/lib/api/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.startsWith("/")
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

function download(url: string) {
  if (!url) return;
  window.open(url.startsWith("http") ? url : `${API_BASE}${url}`, "_blank", "noopener");
}

export interface LabelModalProps {
  panel: Panel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LabelModal({ panel, open, onOpenChange }: LabelModalProps) {
  const { data: templates = [] } = useLabelTemplates();
  const { data: company } = useCompany();
  const render = useRenderLabel();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");

  const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
  const template = templates.find((t) => t.id === templateId) ?? defaultTemplate;

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
    setError(null);
    try {
      const res = await render.mutateAsync({
        panel_id: panel.id,
        template: concept,
        format,
        size: template?.size_mm ?? "90x50",
        template_id: template?.id,
      });
      download(format === "svg" ? res.svg_url ?? res.png_url ?? "" : res.png_url ?? "");
    } catch {
      setError("Could not render the label.");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Generate label"
      sub={`${panel.tag} · ${panel.serial}`}
      width={460}
      footer={
        <>
          <Btn icon="download" disabled={render.isPending} onClick={() => exportLabel("png")}>
            {render.isPending ? "Rendering…" : "PNG"}
          </Btn>
          <Btn
            variant="primary"
            icon="printer"
            disabled={render.isPending}
            onClick={() => exportLabel("png")}
          >
            Print label
          </Btn>
        </>
      }
    >
      {templates.length > 1 && (
        <Select
          value={template?.id ?? ""}
          onChange={(e) => setTemplateId(e.target.value)}
          style={{ marginBottom: 14 }}
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.is_default ? " (default)" : ""}
            </option>
          ))}
        </Select>
      )}
      <div
        style={{
          display: "grid",
          placeItems: "center",
          padding: 18,
          background: "var(--c-surface-3)",
          borderRadius: "var(--r-md)",
        }}
      >
        <LabelSvg layout={layout} data={data} scale={4.2} />
      </div>
      {error && <div style={{ fontSize: 12, color: "var(--c-fault)", marginTop: 10 }}>{error}</div>}
    </Modal>
  );
}
