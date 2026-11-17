"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Monitor } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { Page, PageHeader } from "@/components/ui/page";
import { usePanels, usePermissions } from "@/data/hooks";
import { useElementWidth } from "../label-preview";
import { useDesignerData } from "../use-label-data";
import { EditorCanvas } from "./editor-canvas";
import { ElementPalette } from "./element-palette";
import { Inspector } from "./inspector";
import { NewTemplateDialog } from "./new-template-dialog";
import { TemplateBrowser } from "./template-browser";
import { TemplateList } from "./template-list";
import { Toolbar } from "./toolbar";
import { useTemplateEditor } from "./use-template-editor";
import { useUnsavedGuard } from "./use-unsaved-guard";

const MIN_SCALE = 1.5;
const MAX_SCALE = 24;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function useIsDesktop(): boolean | null {
  const [value, setValue] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setValue(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return value;
}

/** /settings/label-templates */
export function TemplateDesigner() {
  const t = useTranslations("labels");
  const tc = useTranslations("common");
  const { can, ready } = usePermissions();
  const desktop = useIsDesktop();
  const editor = useTemplateEditor();
  const canEdit = can("generate_labels");
  const designing = desktop === true && canEdit;

  useUnsavedGuard(designing && editor.state.dirty);

  return (
    <Page>
      <Button asChild variant="ghost" size="sm" className="-mb-3 self-start">
        <Link href="/settings">
          <ArrowLeft />
          {t("designer.back")}
        </Link>
      </Button>
      <PageHeader title={t("designer.title")} description={t("designer.description")} />
      {!ready || desktop === null || editor.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : editor.isError ? (
        <Card>
          <ErrorState
            title={tc("states.errorTitle")}
            description={tc("states.errorHint")}
            action={
              <Button variant="secondary" onClick={editor.refetch}>
                {tc("actions.retry")}
              </Button>
            }
          />
        </Card>
      ) : designing ? (
        <DesignerWorkspace editor={editor} />
      ) : (
        <>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-info-soft p-3 text-sm">
            <Monitor className="mt-0.5 size-4 shrink-0 text-info" />
            <p>{canEdit ? t("designer.needsLargerScreen") : t("designer.readOnly")}</p>
          </div>
          <TemplateBrowser editor={editor} canEdit={canEdit} />
        </>
      )}
    </Page>
  );
}

function DesignerWorkspace({ editor }: { editor: ReturnType<typeof useTemplateEditor> }) {
  const t = useTranslations("labels");
  const { state } = editor;
  const [zoom, setZoom] = React.useState<number | null>(null);
  const [previewMode, setPreviewMode] = React.useState<"sample" | "panel">("sample");
  const [samplePanelId, setSamplePanelId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const { data: panels } = usePanels();
  const samplePanel = previewMode === "panel" ? panels?.find((p) => p.id === samplePanelId) : undefined;
  const data = useDesignerData(samplePanel);
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const { w, h } = state.layout.size_mm;

  const fit = clamp(Math.min((width - 64) / w, 520 / h), MIN_SCALE, MAX_SCALE);
  const scale = zoom ?? (width > 0 ? fit : 4);

  // Cmd/Ctrl+S saves, Cmd/Ctrl+Z / Shift+Z undo and redo (outside text fields)
  const { save, undo, redo } = editor;
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        void save();
      } else if (key === "z" && !(e.target as HTMLElement | null)?.closest("input,textarea")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, undo, redo]);

  return (
    <>
      <Card className="grid min-h-[36rem] overflow-hidden lg:h-[calc(100dvh-14rem)] lg:grid-cols-[16rem_minmax(0,1fr)_19rem]">
        <aside className="flex min-h-0 flex-col border-r border-border">
          <div className="min-h-0 flex-1">
            <TemplateList
              templates={editor.templates}
              activeId={state.templateId}
              hasUnsaved={state.templateId === null}
              unsavedName={state.name}
              canEdit
              onSelect={(id) => void editor.openTemplate(id)}
              onNew={() => setNewOpen(true)}
              onDuplicate={(id) => void editor.duplicateTemplate(id)}
              onDelete={(id) => void editor.deleteTemplate(id)}
              onSetDefault={(id) => void editor.makeDefault(id)}
            />
          </div>
          <div className="border-t border-border p-3">
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-subtle">
              {t("designer.addElement")}
            </h2>
            <ElementPalette onAdd={editor.addElement} />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <Toolbar
            name={state.name}
            nameError={editor.nameError}
            onName={editor.setName}
            layout={state.layout}
            dirty={state.dirty}
            isNew={state.templateId === null}
            isDefault={state.isDefault}
            onDefault={editor.setDefaultFlag}
            canUndo={editor.canUndo}
            canRedo={editor.canRedo}
            onUndo={editor.undo}
            onRedo={editor.redo}
            scale={scale}
            onZoom={(f) => setZoom(clamp(scale * f, MIN_SCALE, MAX_SCALE))}
            onFit={() => setZoom(null)}
            fitActive={zoom === null}
            previewMode={previewMode}
            onPreviewMode={setPreviewMode}
            samplePanelId={samplePanelId}
            onSamplePanel={setSamplePanelId}
            onSave={() => void editor.save()}
            saving={editor.saving}
          />
          <div ref={ref} className="scroll-thin flex min-h-0 flex-1 overflow-auto bg-surface-3 p-6">
            <div className="m-auto">
              <EditorCanvas
                layout={state.layout}
                data={data}
                scale={scale}
                selectedId={state.selectedId}
                onSelect={editor.select}
                onBeginDrag={editor.beginDrag}
                onDrag={editor.dragElement}
                onChange={editor.changeElement}
                onDelete={editor.removeSelected}
                onDuplicate={editor.duplicateElement}
              />
            </div>
          </div>
        </div>

        <aside className="scroll-thin min-h-0 overflow-y-auto border-l border-border">
          <Inspector
            layout={state.layout}
            selected={editor.selected}
            onSelect={editor.select}
            onChangeElement={editor.changeElement}
            onChangeLayout={editor.patchLayout}
            onDelete={editor.removeSelected}
            onDuplicate={editor.duplicateElement}
            onZ={editor.reorder}
          />
        </aside>
      </Card>
      <NewTemplateDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        templates={editor.templates}
        onCreate={(opts) => void editor.startNew(opts)}
      />
    </>
  );
}
