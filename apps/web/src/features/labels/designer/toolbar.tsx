"use client";

import { Maximize2, Redo2, Save, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { PanelPicker } from "@/components/domain/panel-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented, Switch } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/menu";
import type { LabelLayout } from "@/lib/api/label-layout";

const PX_PER_MM_AT_100 = 96 / 25.4;

export interface ToolbarProps {
  name: string;
  nameError: string | null;
  onName: (v: string) => void;
  layout: LabelLayout;
  dirty: boolean;
  isNew: boolean;
  isDefault: boolean;
  onDefault: (v: boolean) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  scale: number;
  onZoom: (factor: number) => void;
  onFit: () => void;
  fitActive: boolean;
  previewMode: "sample" | "panel";
  onPreviewMode: (m: "sample" | "panel") => void;
  samplePanelId: string | null;
  onSamplePanel: (id: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function Toolbar(p: ToolbarProps) {
  const t = useTranslations("labels");
  const tc = useTranslations("common");
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface p-3">
      <div className="flex flex-wrap items-start gap-3">
        <Field label={t("designer.templateName")} error={p.nameError} className="w-64">
          <Input value={p.name} onChange={(e) => p.onName(e.target.value)} maxLength={80} />
        </Field>
        <div className="flex flex-col gap-1.5 pt-0.5">
          <span className="text-sm font-medium">{t("designer.status")}</span>
          <div className="flex h-9 items-center gap-2">
            {p.dirty ? (
              <Badge tone="warning" dot>
                {p.isNew ? t("designer.unsavedBadge") : t("designer.dirty")}
              </Badge>
            ) : (
              <Badge tone="success" dot>
                {tc("states.saved")}
              </Badge>
            )}
            <span className="font-mono text-xs text-subtle">
              {p.layout.size_mm.w}×{p.layout.size_mm.h} mm
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-end gap-3 self-end">
          <label className="flex h-9 items-center gap-2 text-sm font-medium">
            <Switch checked={p.isDefault} onCheckedChange={p.onDefault} />
            {t("designer.makeDefault")}
          </label>
          <Button loading={p.saving} onClick={p.onSave} disabled={!p.dirty && !p.isNew}>
            {!p.saving && <Save />}
            {tc("actions.save")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5">
          <Tooltip label={t("designer.undo")}>
            <Button variant="ghost" size="icon-sm" aria-label={t("designer.undo")} disabled={!p.canUndo} onClick={p.onUndo}>
              <Undo2 />
            </Button>
          </Tooltip>
          <Tooltip label={t("designer.redo")}>
            <Button variant="ghost" size="icon-sm" aria-label={t("designer.redo")} disabled={!p.canRedo} onClick={p.onRedo}>
              <Redo2 />
            </Button>
          </Tooltip>
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" aria-label={t("preview.zoomOut")} onClick={() => p.onZoom(1 / 1.25)}>
            <ZoomOut />
          </Button>
          <span className="w-11 text-center font-mono text-xs text-muted">
            {Math.round((p.scale / PX_PER_MM_AT_100) * 100)}%
          </span>
          <Button variant="ghost" size="icon-sm" aria-label={t("preview.zoomIn")} onClick={() => p.onZoom(1.25)}>
            <ZoomIn />
          </Button>
          <Button
            variant={p.fitActive ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label={t("preview.fit")}
            aria-pressed={p.fitActive}
            onClick={p.onFit}
          >
            <Maximize2 />
          </Button>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted">{t("designer.previewWith")}</span>
          <Segmented<"sample" | "panel">
            aria-label={t("designer.previewWith")}
            value={p.previewMode}
            onChange={p.onPreviewMode}
            options={[
              { value: "sample", label: t("designer.sampleData") },
              { value: "panel", label: t("designer.realPanel") },
            ]}
          />
          {p.previewMode === "panel" && (
            <div className="w-60">
              <PanelPicker value={p.samplePanelId} onChange={(id) => p.onSamplePanel(id)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
