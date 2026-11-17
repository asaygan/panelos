"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, FileText, FolderPlus, ListTree, Plus, TableProperties, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/controls";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/menu";
import { Page, PageHeader } from "@/components/ui/page";
import { exchangeApi } from "@/data/api";
import { usePermissions, useTree } from "@/data/hooks";
import type { Panel } from "@/data/types";
import { PanelFormDialog } from "../panel-form-dialog";
import { DetailContent, DetailPane, KindLabel, entryTitle } from "./detail-pane";
import { ImportDialog } from "./import-dialog";
import { buildIndex, keyOf, refKey, type NodeRef } from "./model";
import { NewProjectDialog } from "./new-project-dialog";
import { TableView } from "./table-view";
import { TreeView } from "./tree-view";
import { useMediaQuery } from "./use-media-query";
import { useTreeActions } from "./use-tree-actions";

type View = "tree" | "table";

export function PanelsWorkspace() {
  const t = useTranslations("panels");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const tree = useTree();
  const actions = useTreeActions();
  const desktop = useMediaQuery("(min-width: 1024px)");

  const view: View = params.get("view") === "table" ? "table" : "tree";
  const canEdit = can("crud_panels");
  const canExport = can("export_data");
  const importOpen = params.get("import") === "1" && canExport && canEdit;

  const index = React.useMemo(() => buildIndex(tree.data), [tree.data]);

  const setParams = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  // ── Selection with unsaved-changes guard ──────────────────────────────
  const [selected, setSelected] = React.useState<NodeRef | null>(null);
  const [reveal, setReveal] = React.useState<{ key: string; n: number } | null>(null);
  const dirty = React.useRef(false);
  const onDirtyChange = React.useCallback((d: boolean) => {
    dirty.current = d;
  }, []);

  const requestSelect = React.useCallback(
    async (ref: NodeRef | null) => {
      const same = ref?.id === selected?.id && ref?.kind === selected?.kind;
      if (dirty.current && !same) {
        const ok = await confirm({
          title: tc("states.unsavedTitle"),
          description: tc("states.unsavedBody"),
          confirmLabel: tc("states.unsavedDiscard"),
          cancelLabel: tc("states.unsavedKeep"),
          destructive: true,
        });
        if (!ok) return;
        dirty.current = false;
      }
      setSelected(ref);
    },
    [confirm, selected, tc],
  );

  const selectedKey = selected ? refKey(selected) : null;
  const entry = selectedKey ? (index.entries.get(selectedKey) ?? null) : null;

  // The selected node vanished (archived, deleted, moved away): drop the selection.
  React.useEffect(() => {
    if (selectedKey && tree.data && !index.entries.has(selectedKey)) {
      dirty.current = false;
      setSelected(null);
    }
  }, [selectedKey, tree.data, index]);

  // Deep links: ?project=<id> / ?group=<id> select and reveal that node once.
  const deepLinked = React.useRef(false);
  React.useEffect(() => {
    if (deepLinked.current || !tree.data) return;
    const project = params.get("project");
    const group = params.get("group");
    if (!project && !group) return;
    deepLinked.current = true;
    const key = project ? keyOf("project", project) : keyOf("group", group!);
    const found = index.entries.get(key);
    if (found) {
      setSelected({ kind: found.kind, id: found.node.id });
      setReveal({ key, n: 1 });
    }
    setParams({ project: null, group: null });
  }, [tree.data, index, params, setParams]);

  // ── Dialogs ───────────────────────────────────────────────────────────
  const [projectOpen, setProjectOpen] = React.useState(false);
  const [panelDialog, setPanelDialog] = React.useState<{ panel?: Panel; groupId?: string } | null>(null);
  const openEditPanel = React.useCallback((panel: Panel) => setPanelDialog({ panel }), []);
  const openNewPanel = () => setPanelDialog({ groupId: entry?.kind === "group" ? entry.node.id : undefined });

  const viewSwitch = (
    <Segmented<View>
      aria-label={t("view.label")}
      value={view}
      onChange={(v) => setParams({ view: v === "tree" ? null : v })}
      options={[
        { value: "tree", label: t("view.tree"), icon: <ListTree /> },
        { value: "table", label: t("view.table"), icon: <TableProperties /> },
      ]}
    />
  );

  const actionsBar = (
    <>
      {canExport && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download />
              {tc("actions.export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <a href={exchangeApi.exportUrl("panels", "xlsx")} download>
                <FileSpreadsheet aria-hidden />
                {t("export.xlsx")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={exchangeApi.exportUrl("panels", "csv")} download>
                <FileText aria-hidden />
                {t("export.csv")}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {canExport && canEdit && (
        <Button onClick={() => setParams({ import: "1" })}>
          <Upload />
          {tc("actions.import")}
        </Button>
      )}
      {canEdit && (
        <>
          <Button onClick={() => setProjectOpen(true)}>
            <FolderPlus />
            {t("toolbar.newProject")}
          </Button>
          <Button variant="primary" onClick={openNewPanel}>
            <Plus />
            {t("toolbar.newPanel")}
          </Button>
        </>
      )}
    </>
  );

  let body: React.ReactNode;
  if (view === "table") {
    body = <TableView viewSwitch={viewSwitch} canCreate={canEdit} onCreate={openNewPanel} />;
  } else if (tree.isLoading) {
    body = (
      <Card>
        <div className="border-b border-border p-2">{viewSwitch}</div>
        <SkeletonRows rows={8} />
      </Card>
    );
  } else if (tree.isError) {
    body = (
      <Card>
        <div className="border-b border-border p-2">{viewSwitch}</div>
        <ErrorState
          title={tc("states.errorTitle")}
          description={tc("states.errorHint")}
          action={<Button onClick={() => void tree.refetch()}>{tc("actions.retry")}</Button>}
        />
      </Card>
    );
  } else {
    body = (
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <TreeView
          index={index}
          selectedKey={selectedKey}
          canEdit={canEdit}
          reveal={reveal}
          viewSwitch={viewSwitch}
          actions={actions}
          onSelect={(r) => void requestSelect(r)}
          onEditPanel={openEditPanel}
          onNewProject={() => setProjectOpen(true)}
        />
        <DetailPane entry={entry} canEdit={canEdit} onDirtyChange={onDirtyChange} onEditPanel={openEditPanel} onClose={() => void requestSelect(null)} />
      </div>
    );
  }

  return (
    <Page>
      <PageHeader title={t("title")} description={t("description")} actions={actionsBar} />
      {body}

      {view === "tree" && !desktop && (
        <Dialog open={!!entry} onOpenChange={(o) => !o && void requestSelect(null)}>
          {entry && (
            <SheetContent
              title={entryTitle(entry)}
              description={<KindLabel kind={entry.kind} />}
              closeLabel={tc("actions.close")}
            >
              <DetailContent entry={entry} canEdit={canEdit} onDirtyChange={onDirtyChange} onEditPanel={openEditPanel} />
            </SheetContent>
          )}
        </Dialog>
      )}

      <NewProjectDialog open={projectOpen} onOpenChange={setProjectOpen} />
      <PanelFormDialog
        open={!!panelDialog}
        onOpenChange={(o) => !o && setPanelDialog(null)}
        panel={panelDialog?.panel}
        defaults={{ system_group_id: panelDialog?.groupId }}
      />
      <ImportDialog open={importOpen} onOpenChange={(o) => !o && setParams({ import: null })} />
    </Page>
  );
}
