"use client";

import * as React from "react";
import { ChevronsDownUp, ChevronsUpDown, FolderKanban, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import type { PanelNode } from "@/data/types";
import {
  UNASSIGNED_KEY,
  ancestorsOf,
  flatten,
  keyOf,
  type IndexEntry,
  type NodeRef,
  type PendingMove,
  type Row,
  type TreeIndex,
} from "./model";
import { MoveBar } from "./move-bar";
import { MoveDialog, type MoveTarget } from "./move-dialog";
import type { NodeAction } from "./node-menu";
import { QuickAdd } from "./quick-add";
import { TreeDnd } from "./tree-dnd";
import { TreeRow, rowDomId, type VisibleRow } from "./tree-row";
import type { TreeActions } from "./use-tree-actions";
import { useExpanded } from "./use-expanded";

export interface TreeViewProps {
  index: TreeIndex;
  selectedKey: string | null;
  canEdit: boolean;
  /** Reveal (expand ancestors, scroll to, focus) this node when `n` changes. */
  reveal: { key: string; n: number } | null;
  viewSwitch: React.ReactNode;
  actions: TreeActions;
  onSelect: (ref: NodeRef) => void;
  onEditPanel: (panel: PanelNode) => void;
  onNewProject: () => void;
}

const isVisible = (r: Row): r is VisibleRow => r.type !== "add";

export function TreeView({ index, selectedKey, canEdit, reveal, viewSwitch, actions, onSelect, onEditPanel, onNewProject }: TreeViewProps) {
  const t = useTranslations("panels.tree");
  const tc = useTranslations("common");
  const { expanded, toggle, open, replace } = useExpanded(index.projectKeys, index.projects.length > 0);
  const [filter, setFilter] = React.useState("");
  const [adding, setAdding] = React.useState<string | null>(null);
  const [menuKey, setMenuKey] = React.useState<string | null>(null);
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingMove | null>(null);
  const [moveBusy, setMoveBusy] = React.useState(false);
  const [moveTarget, setMoveTarget] = React.useState<MoveTarget | null>(null);
  const scrollTo = React.useRef<string | null>(null);

  const rows = React.useMemo(
    () => flatten({ index, expanded, filter, canEdit, adding }),
    [index, expanded, filter, canEdit, adding],
  );
  const nav = React.useMemo(() => rows.filter(isVisible), [rows]);
  const tabKey = nav.some((r) => r.key === focusKey) ? focusKey : (nav[0]?.key ?? null);

  // Latest values for stable callbacks (keeps memoized rows from re-rendering).
  const latest = React.useRef({ nav, index, onSelect, onEditPanel, actions });
  latest.current = { nav, index, onSelect, onEditPanel, actions };

  const focusRow = React.useCallback((key: string) => {
    requestAnimationFrame(() => document.getElementById(rowDomId(key))?.focus());
  }, []);

  // Deep link / external reveal.
  React.useEffect(() => {
    if (!reveal) return;
    setFilter("");
    open(ancestorsOf(latest.current.index, reveal.key));
    setFocusKey(reveal.key);
    scrollTo.current = reveal.key;
  }, [reveal, open]);

  React.useEffect(() => {
    const key = scrollTo.current;
    if (!key) return;
    const el = document.getElementById(rowDomId(key));
    if (el) {
      el.scrollIntoView({ block: "nearest" });
      scrollTo.current = null;
    }
  }, [rows]);

  React.useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !moveBusy && setPending(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, moveBusy]);

  const executeMove = async (m: PendingMove) => {
    const ok = m.kind === "panel" ? await actions.movePanel(m.id, m.targetId) : await actions.moveCabinet(m.id, m.targetId!);
    if (ok) {
      open([m.targetId === null ? UNASSIGNED_KEY : keyOf(m.kind === "panel" ? "group" : "panel", m.targetId)]);
    }
    return ok;
  };

  const activate = React.useCallback(
    (key: string) => {
      setFocusKey(key);
      if (key === UNASSIGNED_KEY) return toggle(key);
      const entry = latest.current.index.entries.get(key);
      if (entry) latest.current.onSelect({ kind: entry.kind, id: entry.node.id });
    },
    [toggle],
  );

  const startAdd = React.useCallback(
    (parentKey: string) => {
      setFilter("");
      open([parentKey]);
      setAdding(parentKey);
    },
    [open],
  );

  const menuAction = React.useCallback(
    (key: string, action: NodeAction) => {
      const { index: idx, actions: act } = latest.current;
      if (key === UNASSIGNED_KEY) return startAdd(key);
      const entry: IndexEntry | undefined = idx.entries.get(key);
      if (!entry) return;
      if (action === "addChild") return startAdd(key);
      if (action === "edit") {
        return entry.kind === "panel"
          ? latest.current.onEditPanel(entry.node)
          : latest.current.onSelect({ kind: entry.kind, id: entry.node.id });
      }
      if (action === "move" && entry.kind === "panel") {
        return setMoveTarget({ kind: "panel", id: entry.node.id, label: entry.node.name, fromId: entry.node.system_group_id ?? null });
      }
      if (action === "move" && entry.kind === "cabinet") {
        return setMoveTarget({ kind: "cabinet", id: entry.node.id, label: entry.node.name, fromId: entry.node.panel_id });
      }
      if (action === "archive") void act.archive(entry);
      if (action === "delete") void act.remove(entry);
    },
    [startAdd],
  );

  const submitAdd = React.useCallback(async (row: Extract<Row, { type: "add" }>, name: string) => {
    const { index: idx, actions: act } = latest.current;
    const parent = idx.entries.get(row.parentKey);
    if (row.addKind === "group" && parent?.kind === "project") return act.createGroup(parent.node.id, name);
    if (row.addKind === "cabinet" && parent?.kind === "panel") return act.createCabinet(parent.node.id, name);
    if (row.addKind === "panel") {
      if (row.parentKey === UNASSIGNED_KEY) return act.createPanel(null, name);
      if (parent?.kind === "group") return act.createPanel(parent.node.id, name);
    }
    return false;
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = e.target as HTMLElement;
    if (el.closest("input,textarea,select,[role=menu]") || e.metaKey || e.ctrlKey || e.altKey) return;
    const i = nav.findIndex((r) => r.key === tabKey);
    const cur = nav[i];
    if (!cur) return;
    const go = (r?: VisibleRow) => {
      if (!r) return;
      e.preventDefault();
      setFocusKey(r.key);
      focusRow(r.key);
    };
    switch (e.key) {
      case "ArrowDown":
        return go(nav[i + 1]);
      case "ArrowUp":
        return go(nav[i - 1]);
      case "Home":
        return go(nav[0]);
      case "End":
        return go(nav[nav.length - 1]);
      case "ArrowRight":
        e.preventDefault();
        if (cur.expandable && !cur.expanded) toggle(cur.key, true);
        else if (cur.expanded && nav[i + 1] && nav[i + 1]!.level > cur.level) go(nav[i + 1]);
        return;
      case "ArrowLeft":
        e.preventDefault();
        if (cur.expanded) toggle(cur.key, false);
        else go([...nav.slice(0, i)].reverse().find((r) => r.level < cur.level));
        return;
      case "Enter":
        e.preventDefault();
        return activate(cur.key);
      case "ContextMenu":
        e.preventDefault();
        return setMenuKey(cur.key);
      case "F10":
        if (e.shiftKey) {
          e.preventDefault();
          setMenuKey(cur.key);
        }
    }
  };

  const expandAll = () => {
    const keys = [UNASSIGNED_KEY, ...index.projectKeys];
    for (const e of index.entries.values()) {
      if (e.kind === "group" || (e.kind === "panel" && (e.node.cabinets?.length ?? 0) > 0)) keys.push(e.key);
    }
    replace(new Set(keys));
  };

  const hasContent = index.projects.length > 0 || index.unassigned.length > 0;
  const filtering = filter.trim().length > 0;

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
      {viewSwitch}
      <div className="relative min-w-40 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label={t("filter")}
          placeholder={t("filter")}
          className="h-8 pl-8 pr-8 text-sm"
        />
        {filtering && (
          <button
            type="button"
            aria-label={tc("actions.clear")}
            onClick={() => setFilter("")}
            className="absolute right-1.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-subtle hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label={t("expandAll")} title={t("expandAll")} onClick={expandAll}>
          <ChevronsUpDown />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={t("collapseAll")} title={t("collapseAll")} onClick={() => replace(new Set())}>
          <ChevronsDownUp />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="min-w-0">
      {toolbar}
      {!hasContent ? (
        <EmptyState
          icon={<FolderKanban />}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={canEdit ? <Button variant="primary" onClick={onNewProject}>{t("createFirst")}</Button> : undefined}
        />
      ) : filtering && nav.length === 0 ? (
        <EmptyState
          title={tc("states.noResults")}
          description={t("noMatch", { query: filter.trim() })}
          action={<Button onClick={() => setFilter("")}>{tc("actions.clear")}</Button>}
        />
      ) : (
        <TreeDnd onDrop={setPending}>
          <div
            role="tree"
            aria-label={t("aria")}
            aria-multiselectable={false}
            onKeyDown={onKeyDown}
            onFocus={(e) => {
              const key = (e.target as HTMLElement).closest<HTMLElement>("[role=treeitem]")?.dataset.key;
              if (key) setFocusKey(key);
            }}
            className="p-2"
          >
            {rows.map((row) =>
              row.type === "add" ? (
                <QuickAdd key={row.key} row={row} onStart={startAdd} onCancel={() => setAdding(null)} onSubmit={submitAdd} />
              ) : (
                <TreeRow
                  key={row.key}
                  row={row}
                  selected={selectedKey === row.key}
                  tabbable={tabKey === row.key}
                  menuOpen={menuKey === row.key}
                  canEdit={canEdit}
                  onToggle={toggle}
                  onActivate={activate}
                  onMenuOpenChange={(key, o) => setMenuKey(o ? key : null)}
                  onMenuAction={menuAction}
                  onMenuClosed={focusRow}
                />
              ),
            )}
          </div>
        </TreeDnd>
      )}
      {pending && (
        <div className="px-2 pb-2">
          <MoveBar
            move={pending}
            busy={moveBusy}
            onCancel={() => setPending(null)}
            onConfirm={async () => {
              setMoveBusy(true);
              const ok = await executeMove(pending);
              setMoveBusy(false);
              if (ok) setPending(null);
            }}
          />
        </div>
      )}
      <MoveDialog target={moveTarget} index={index} onClose={() => setMoveTarget(null)} onMove={executeMove} />
    </Card>
  );
}

