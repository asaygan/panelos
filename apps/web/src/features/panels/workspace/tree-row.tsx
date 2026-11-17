"use client";

import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Box, ChevronRight, FolderKanban, Inbox, Layers, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { DocStatusBadge, LifecycleBadge } from "@/components/domain/badges";
import { cn } from "@/lib/utils/cn";
import type { DragData, DropData, Row } from "./model";
import { NodeMenu, type NodeAction } from "./node-menu";
import { IssueCount, OverdueMark } from "./panel-cells";

export type VisibleRow = Exclude<Row, { type: "add" }>;

export const rowDomId = (key: string) => `tree-${key}`;

export interface TreeRowProps {
  row: VisibleRow;
  selected: boolean;
  tabbable: boolean;
  menuOpen: boolean;
  canEdit: boolean;
  onToggle: (key: string) => void;
  onActivate: (key: string) => void;
  onMenuOpenChange: (key: string, open: boolean) => void;
  onMenuAction: (key: string, action: NodeAction) => void;
  onMenuClosed: (key: string) => void;
}

const dragHighlight =
  "group-data-[drag=panel]/tree:data-[accepts=panel]:bg-primary-soft/50 group-data-[drag=cabinet]/tree:data-[accepts=cabinet]:bg-primary-soft/50";

function sameRow(a: TreeRowProps, b: TreeRowProps) {
  const ra = a.row;
  const rb = b.row;
  if (a.selected !== b.selected || a.tabbable !== b.tabbable || a.menuOpen !== b.menuOpen || a.canEdit !== b.canEdit) return false;
  if (ra.type !== rb.type || ra.key !== rb.key || ra.level !== rb.level) return false;
  if (ra.expanded !== rb.expanded || ra.expandable !== rb.expandable) return false;
  if (ra.posInSet !== rb.posInSet || ra.setSize !== rb.setSize) return false;
  if (ra.type === "unassigned" && rb.type === "unassigned") return ra.count === rb.count;
  if (ra.type === "node" && rb.type === "node") {
    return ra.entry.node === rb.entry.node && ra.counts.a === rb.counts.a && ra.counts.b === rb.counts.b;
  }
  return false;
}

/** Row content (no hooks tied to drag state, so it can be memoized hard). */
const RowBody = React.memo(function RowBody({
  row,
  selected,
  canEdit,
  menuOpen,
  onToggle,
  onMenuOpenChange,
  onMenuAction,
  onMenuClosed,
}: TreeRowProps) {
  const t = useTranslations("panels.row");
  const tg = useTranslations("common.groupType");
  const key = row.key;

  const chevron = row.expandable ? (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onMouseDown={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(key);
      }}
      className="grid size-6 shrink-0 place-items-center rounded text-subtle hover:bg-surface-3 hover:text-foreground"
    >
      <ChevronRight className={cn("size-4 transition-transform", row.expanded && "rotate-90")} />
    </button>
  ) : (
    <span className="size-6 shrink-0" aria-hidden />
  );

  let icon: React.ReactNode;
  let main: React.ReactNode;
  let meta: React.ReactNode = null;
  let kind: "project" | "group" | "panel" | "cabinet" | "unassigned" = "unassigned";
  let panelId: string | undefined;

  if (row.type === "unassigned") {
    icon = <Inbox />;
    main = (
      <>
        <span className="truncate font-medium">{t("unassigned")}</span>
        <span className="shrink-0 text-xs text-subtle">{row.count}</span>
      </>
    );
  } else {
    const { entry } = row;
    kind = entry.kind;
    switch (entry.kind) {
      case "project":
        icon = <FolderKanban className="text-primary" />;
        main = (
          <>
            <span className="truncate font-semibold">{entry.node.name}</span>
            {entry.node.code && <span className="hidden shrink-0 font-mono text-xs text-subtle xl:inline">{entry.node.code}</span>}
          </>
        );
        meta = (
          <>
            <span className="hidden whitespace-nowrap text-xs text-subtle 2xl:inline">
              {t("projectCounts", { groups: row.counts.a, panels: row.counts.b })}
            </span>
            <LifecycleBadge status={entry.node.lifecycle_status} />
          </>
        );
        break;
      case "group":
        icon = <Layers />;
        main = (
          <>
            <span className="truncate font-medium">{entry.node.name}</span>
            <span className="hidden shrink-0 text-xs text-subtle xl:inline">
              {entry.node.code ? <span className="font-mono">{entry.node.code}</span> : tg(entry.node.group_type)}
            </span>
          </>
        );
        meta = (
          <>
            <span className="hidden whitespace-nowrap text-xs text-subtle 2xl:inline">{t("panelCount", { count: row.counts.a })}</span>
            <span className="hidden sm:inline-flex">
              <LifecycleBadge status={entry.node.lifecycle_status} />
            </span>
          </>
        );
        break;
      case "panel": {
        const p = entry.node;
        panelId = p.id;
        icon = <Zap />;
        main = (
          <>
            <span className="shrink-0 font-mono text-sm font-medium">{p.tag}</span>
            <span className="truncate text-muted">{p.name}</span>
          </>
        );
        meta = (
          <>
            {p.maintenance_overdue && <OverdueMark />}
            <IssueCount count={p.open_issue_count} severity={p.worst_open_severity} />
            <span className="hidden md:inline-flex">
              <DocStatusBadge status={p.doc_status} />
            </span>
          </>
        );
        break;
      }
      case "cabinet":
        icon = <Box />;
        main = (
          <>
            <span className="truncate">{entry.node.name}</span>
            {entry.node.code && <span className="hidden shrink-0 font-mono text-xs text-subtle xl:inline">{entry.node.code}</span>}
          </>
        );
        break;
    }
  }

  return (
    <>
      {chevron}
      <span className="shrink-0 text-subtle [&_svg]:size-4">{icon}</span>
      <span className="flex min-w-24 flex-1 items-baseline gap-2 text-base">{main}</span>
      <span className="flex min-w-0 shrink items-center gap-1.5 overflow-hidden">{meta}</span>
      <NodeMenu
        kind={kind}
        panelId={panelId}
        canEdit={canEdit}
        selected={selected}
        open={menuOpen}
        onOpenChange={(o) => onMenuOpenChange(key, o)}
        onAction={(a) => onMenuAction(key, a)}
        onClosed={() => onMenuClosed(key)}
      />
    </>
  );
}, sameRow);

/** One treeitem. Registers itself as draggable / droppable where the hierarchy allows it. */
export const TreeRow = React.memo(function TreeRow(props: TreeRowProps) {
  const { row, selected, tabbable, canEdit } = props;
  const tr = useTranslations("panels.row");

  const { dragData, dropData } = React.useMemo(() => {
    let drag: DragData | undefined;
    let drop: DropData | undefined;
    if (row.type === "unassigned") {
      drop = { accepts: "panel", targetId: null, label: tr("unassigned") };
    } else if (row.entry.kind === "panel") {
      const p = row.entry.node;
      drag = { kind: "panel", id: p.id, label: p.name, fromId: p.system_group_id ?? null };
      drop = { accepts: "cabinet", targetId: p.id, label: p.name };
    } else if (row.entry.kind === "cabinet") {
      drag = { kind: "cabinet", id: row.entry.node.id, label: row.entry.node.name, fromId: row.entry.node.panel_id };
    } else if (row.entry.kind === "group") {
      drop = { accepts: "panel", targetId: row.entry.node.id, label: row.entry.node.name };
    }
    return { dragData: drag, dropData: drop };
  }, [row, tr]);

  const drag = useDraggable({ id: `drag:${row.key}`, data: dragData, disabled: !dragData || !canEdit });
  const drop = useDroppable({ id: `drop:${row.key}`, data: dropData, disabled: !dropData || !canEdit });
  const { setNodeRef: setDrag } = drag;
  const { setNodeRef: setDrop } = drop;
  const setRefs = React.useCallback(
    (el: HTMLDivElement | null) => {
      setDrag(el);
      setDrop(el);
    },
    [setDrag, setDrop],
  );

  const dragging = drag.active?.data.current as DragData | undefined;
  const hovering =
    drop.isOver && !!dropData && dragging?.kind === dropData.accepts && dragging.fromId !== dropData.targetId;

  return (
    <div
      ref={setRefs}
      id={rowDomId(row.key)}
      role="treeitem"
      aria-level={row.level}
      aria-posinset={row.posInSet}
      aria-setsize={row.setSize}
      aria-expanded={row.expandable ? row.expanded : undefined}
      aria-selected={selected}
      aria-describedby={dragData && canEdit ? drag.attributes["aria-describedby"] : undefined}
      tabIndex={tabbable ? 0 : -1}
      data-key={row.key}
      data-accepts={dropData && canEdit ? dropData.accepts : undefined}
      {...(dragData && canEdit ? drag.listeners : {})}
      onClick={() => props.onActivate(row.key)}
      style={{ paddingLeft: (row.level - 1) * 20 + 4 }}
      className={cn(
        "group/row flex h-9 cursor-pointer select-none items-center gap-1.5 rounded pr-1.5 outline-none [contain-intrinsic-size:auto_36px] [content-visibility:auto]",
        "hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60",
        dragHighlight,
        selected && "bg-primary-soft hover:bg-primary-soft",
        drag.isDragging && "opacity-40",
        hovering && "bg-primary-soft ring-2 ring-inset ring-primary",
      )}
    >
      <RowBody {...props} />
    </div>
  );
}, sameRow);
