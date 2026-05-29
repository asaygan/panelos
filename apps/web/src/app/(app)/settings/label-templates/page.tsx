"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Page } from "@/components/primitives/page";
import { ElementPalette } from "@/components/labels/template-editor/element-palette";
import { EditorCanvas } from "@/components/labels/template-editor/editor-canvas";
import { EditorToolbar } from "@/components/labels/template-editor/editor-toolbar";
import { Inspector } from "@/components/labels/template-editor/inspector";
import { TemplateList } from "@/components/labels/template-editor/template-list";
import {
  buildLabelData,
  coerceLayout,
  defaultEngravedLayout,
  SAMPLE_DATA,
  makeElement,
  nextId,
  type ElementType,
  type LabelElement,
  type LabelLayout,
} from "@/lib/api/label-layout";
import {
  usePanels,
  useCompany,
  useLabelTemplates,
  useCreateLabelTemplate,
  useUpdateLabelTemplate,
  useDeleteLabelTemplate,
  useSetDefaultTemplate,
} from "@/lib/query/hooks";
import type { LabelTemplateDTO } from "@/lib/api/endpoints";
import { files } from "@/lib/api/endpoints";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");

export default function LabelTemplatesPage() {
  const { data: templates = [] } = useLabelTemplates();
  const { data: panels = [] } = usePanels();
  const { data: company } = useCompany();
  const createT = useCreateLabelTemplate();
  const updateT = useUpdateLabelTemplate();
  const deleteT = useDeleteLabelTemplate();
  const setDefault = useSetDefaultTemplate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("New template");
  const [isDefault, setIsDefault] = useState(false);
  const [layout, setLayout] = useState<LabelLayout>(defaultEngravedLayout());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(4);
  const [samplePanelId, setSamplePanelId] = useState("");
  const [saved, setSaved] = useState(false);
  const initialized = useRef(false);

  const logoKey =
    company && "logo_key" in company ? (company as { logo_key?: string | null }).logo_key : null;
  const logoUrl = logoKey ? files.serveUrl(logoKey) : null;
  const samplePanel = panels.find((p) => p.id === samplePanelId);
  const data = useMemo(
    () =>
      samplePanel
        ? buildLabelData(samplePanel, company, { appUrl: APP_URL, logoUrl })
        : {
            ...SAMPLE_DATA,
            company: company?.name ?? SAMPLE_DATA.company,
            company_short:
              (company && "short_name" in company
                ? (company as { short_name?: string }).short_name
                : null) ?? SAMPLE_DATA.company_short,
            logo_url: logoUrl,
          },
    [samplePanel, company, logoUrl],
  );

  const loadTemplate = (t: LabelTemplateDTO) => {
    setEditingId(t.id);
    setName(t.name);
    setIsDefault(t.is_default);
    const coerced = coerceLayout(t.layout_json, t.concept === "plain" ? "plain" : "engraved");
    const orientation =
      t.orientation === "portrait" || t.orientation === "landscape"
        ? t.orientation
        : coerced.orientation;
    setLayout({ ...coerced, orientation });
    setSelectedId(null);
    setSaved(false);
  };

  useEffect(() => {
    if (!initialized.current && templates.length > 0) {
      initialized.current = true;
      loadTemplate(templates[0]!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates.length]);

  // ── layout mutations ────────────────────────────────────────────────────────────
  const patchLayout = (l: LabelLayout) => {
    setLayout(l);
    setSaved(false);
  };
  const updateElement = (el: LabelElement) =>
    patchLayout({
      ...layout,
      elements: layout.elements.map((e) => (e.id === el.id ? el : e)),
    });
  const deleteElement = (id: string) => {
    patchLayout({ ...layout, elements: layout.elements.filter((e) => e.id !== id) });
    setSelectedId(null);
  };
  const duplicateElement = (id: string) => {
    const el = layout.elements.find((e) => e.id === id);
    if (!el) return;
    const maxZ = Math.max(0, ...layout.elements.map((e) => e.z));
    const copy: LabelElement = { ...el, id: nextId(), x: el.x + 2, y: el.y + 2, z: maxZ + 1 };
    patchLayout({ ...layout, elements: [...layout.elements, copy] });
    setSelectedId(copy.id);
  };
  const addElement = (kind: ElementType) => {
    const { w, h } = layout.size_mm;
    const maxZ = Math.max(0, ...layout.elements.map((e) => e.z));
    const el = makeElement(kind, w / 2, h / 2, maxZ + 1, layout.background.kind === "engraved");
    patchLayout({ ...layout, elements: [...layout.elements, el] });
    setSelectedId(el.id);
  };
  const reorderZ = (id: string, dir: "forward" | "back") => {
    const sorted = [...layout.elements].sort((a, b) => a.z - b.z);
    const idx = sorted.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const swap = dir === "forward" ? idx + 1 : idx - 1;
    if (swap < 0 || swap >= sorted.length) return;
    const a = sorted[idx]!;
    const b = sorted[swap]!;
    patchLayout({
      ...layout,
      elements: layout.elements.map((e) =>
        e.id === a.id ? { ...e, z: b.z } : e.id === b.id ? { ...e, z: a.z } : e,
      ),
    });
  };

  // ── document ops ───────────────────────────────────────────────────────────────
  const newBlank = () => {
    setEditingId(null);
    setName("New template");
    setIsDefault(false);
    setLayout({ ...defaultEngravedLayout(), elements: [] });
    setSelectedId(null);
    setSaved(false);
  };
  const newFromDefault = () => {
    const def = templates.find((t) => t.is_default) ?? templates[0];
    setEditingId(null);
    setName(def ? `${def.name} copy` : "New template");
    setIsDefault(false);
    setLayout(def ? coerceLayout(def.layout_json) : defaultEngravedLayout());
    setSelectedId(null);
    setSaved(false);
  };
  const duplicateTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setEditingId(null);
    setName(`${t.name} copy`);
    setIsDefault(false);
    setLayout(coerceLayout(t.layout_json, t.concept === "plain" ? "plain" : "engraved"));
    setSelectedId(null);
    setSaved(false);
  };

  const concept = layout.background.kind === "engraved" ? "engraved" : "plain";
  const sizeStr = `${layout.size_mm.w}x${layout.size_mm.h}`;
  const layoutJson = layout as unknown as { [k: string]: unknown };

  const save = async () => {
    setSaved(false);
    if (editingId) {
      await updateT.mutateAsync({
        id: editingId,
        body: {
          name,
          concept,
          size_mm: sizeStr,
          orientation: layout.orientation,
          layout_json: layoutJson,
          is_default: isDefault,
        },
      });
    } else {
      const created = await createT.mutateAsync({
        name,
        concept,
        size_mm: sizeStr,
        orientation: layout.orientation,
        layout_json: layoutJson,
        is_default: isDefault,
      });
      setEditingId(created.id);
    }
    setSaved(true);
  };

  const selected = layout.elements.find((e) => e.id === selectedId) ?? null;
  const saving = createT.isPending || updateT.isPending;

  // fit-to-container: pick a scale that keeps width ≤ ~640px
  const fit = () => {
    const target = 640;
    setScale(Math.max(1.5, Math.min(8, target / layout.size_mm.w)));
  };

  return (
    <Page pad={false}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "230px 1fr 280px",
          height: "calc(100vh - var(--topbar-h))",
        }}
      >
        {/* left rail: template list + palette */}
        <div
          style={{
            borderRight: "1px solid var(--c-line)",
            background: "var(--c-surface)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, overflow: "auto" }}>
            <TemplateList
              templates={templates}
              activeId={editingId}
              onSelect={(id) => {
                const t = templates.find((x) => x.id === id);
                if (t) loadTemplate(t);
              }}
              onNewBlank={newBlank}
              onNewFromDefault={newFromDefault}
              onDuplicate={duplicateTemplate}
              onDelete={(id) => {
                deleteT.mutate(id);
                if (editingId === id) newBlank();
              }}
              onSetDefault={(id) => setDefault.mutate(id)}
            />
          </div>
          <div style={{ borderTop: "1px solid var(--c-line)", padding: 10 }}>
            <div className="label-cap" style={{ marginBottom: 8 }}>
              Add element
            </div>
            <ElementPalette onAdd={addElement} />
          </div>
        </div>

        {/* center: toolbar + canvas */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <EditorToolbar
            name={name}
            onName={(v) => {
              setName(v);
              setSaved(false);
            }}
            layout={layout}
            panels={panels}
            samplePanelId={samplePanelId}
            onSamplePanel={setSamplePanelId}
            scale={scale}
            onZoomIn={() => setScale((s) => Math.min(8, s + 0.5))}
            onZoomOut={() => setScale((s) => Math.max(1.5, s - 0.5))}
            onFit={fit}
            isDefault={isDefault}
            onToggleDefault={() => {
              setIsDefault((v) => !v);
              setSaved(false);
            }}
            onSave={save}
            saving={saving}
            saved={saved}
          />
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
            <EditorCanvas
              layout={layout}
              data={data}
              scale={scale}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={updateElement}
              onDelete={deleteElement}
              onDuplicate={duplicateElement}
            />
          </div>
        </div>

        {/* right: inspector */}
        <div
          style={{
            borderLeft: "1px solid var(--c-line)",
            background: "var(--c-surface)",
            overflow: "auto",
          }}
        >
          <Inspector
            layout={layout}
            selected={selected}
            onChangeElement={updateElement}
            onChangeLayout={patchLayout}
            onDelete={deleteElement}
            onDuplicate={duplicateElement}
            onZ={reorderZ}
          />
        </div>
      </div>
    </Page>
  );
}
