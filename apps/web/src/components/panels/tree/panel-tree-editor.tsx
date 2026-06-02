"use client";

import { Fragment, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Icon } from "@/components/icons/icon";
import { Empty } from "@/components/primitives/empty";
import { GROUP_TYPE_META } from "@/lib/api/adapters";
import { STATUS_META } from "@/lib/utils/status";
import type { Cabinet, Panel, ProjectNode, SystemGroupNode } from "@/lib/api/types";
import { InlineAddRow } from "./inline-add-row";
import type { NodeRef, SelectionApi } from "./selection";

function dragId(ref: NodeRef): string {
  return `${ref.kind}:${ref.id}`;
}

function DraggableRow({
  refNode,
  children,
}: {
  refNode: NodeRef;
  children: (args: {
    setRef: (el: HTMLElement | null) => void;
    listeners: ReturnType<typeof useDraggable>["listeners"];
    attributes: ReturnType<typeof useDraggable>["attributes"];
    isDragging: boolean;
  }) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId(refNode),
    data: refNode,
  });
  return <>{children({ setRef: setNodeRef, listeners, attributes, isDragging })}</>;
}

function DroppableWrap({
  refNode,
  children,
}: {
  refNode: NodeRef;
  children: (args: { setRef: (el: HTMLElement | null) => void; isOver: boolean }) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:${dragId(refNode)}`,
    data: refNode,
  });
  return <>{children({ setRef: setNodeRef, isOver })}</>;
}

export interface PanelTreeEditorProps {
  projects: ProjectNode[];
  unassigned: Panel[];
  selection: SelectionApi;
  /** Inline quick-create handlers (omit to hide the rows). */
  onCreateGroup?: (args: { project_id: string; name: string }) => Promise<unknown>;
  onCreatePanel?: (args: { system_group_id: string | null; name: string }) => Promise<unknown>;
  onCreateCabinet?: (args: { panel_id: string; name: string }) => Promise<unknown>;
}

/** Selectable, collapsible 4-level tree (Project → System Group → Panel → Cabinet). */
export function PanelTreeEditor({
  projects,
  unassigned,
  selection,
  onCreateGroup,
  onCreatePanel,
  onCreateCabinet,
}: PanelTreeEditorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  if (projects.length === 0 && unassigned.length === 0) {
    return (
      <Empty
        icon="layout-grid"
        title="No projects yet"
        sub="Create a project (a facility or site) to start organizing your assets."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {projects.map((proj) => {
        const projKey = `proj:${proj.id}`;
        const projOpen = !collapsed[projKey];
        const projRef: NodeRef = { kind: "project", id: proj.id };
        const projSelected = selection.isSelected(projRef);
        const projStatus = STATUS_META[proj.lifecycle_status];
        return (
          <Fragment key={proj.id}>
            {/* Project row */}
            <div
              onClick={() => {
                selection.select(projRef);
                toggle(projKey);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "10px 12px",
                background: projSelected ? "var(--c-accent-soft, var(--c-surface-2))" : "var(--c-surface-2)",
                borderLeft: projSelected ? "3px solid var(--c-accent)" : "3px solid transparent",
                borderBottom: "1px solid var(--c-line-strong)",
                cursor: "pointer",
              }}
            >
              <Icon
                name="chevron-right"
                size={14}
                style={{
                  color: "var(--c-ink-3)",
                  transform: projOpen ? "rotate(90deg)" : "none",
                  transition: "transform .12s",
                  flex: "none",
                }}
              />
              <Icon name="layout-grid" size={15} style={{ color: "var(--c-accent)", flex: "none" }} />
              <span style={{ fontWeight: 700, fontSize: "var(--fz)" }}>{proj.name}</span>
              {proj.code && (
                <span className="mono" style={{ fontSize: 10, color: "var(--c-ink-4)" }}>
                  {proj.code}
                </span>
              )}
              <span
                className={`badge ${projStatus.cls}`}
                style={{ marginLeft: "auto", fontSize: 10 }}
              >
                <span className={`dot ${projStatus.dot}`} />
                {projStatus.label}
              </span>
            </div>

            {projOpen &&
              proj.groups.map((g) => renderGroup(g))}
            {projOpen && onCreateGroup && (
              <InlineAddRow
                label={proj.groups.length === 0 ? "Add first system group" : "Add system group"}
                icon="git-branch"
                indent={30}
                placeholder="System group name (MCC, LVDP, PLC…)"
                onCreate={(name) => onCreateGroup({ project_id: proj.id, name })}
              />
            )}
          </Fragment>
        );
      })}

      {unassigned.length > 0 && (
        <Fragment>
          <div
            style={{
              padding: "8px 12px",
              background: "var(--c-surface-2)",
              borderBottom: "1px solid var(--c-line-strong)",
              fontSize: 11,
              color: "var(--c-ink-3)",
            }}
          >
            Unassigned panels
          </div>
          {unassigned.map((p) => renderPanel(p))}
        </Fragment>
      )}
    </div>
  );

  function renderGroup(g: SystemGroupNode) {
    const groupKey = `group:${g.id}`;
    const open = !collapsed[groupKey];
    const ref: NodeRef = { kind: "group", id: g.id };
    const sel = selection.isSelected(ref);
    const meta = GROUP_TYPE_META[g.group_type];
    const lcMeta = STATUS_META[g.lifecycle_status];
    return (
      <Fragment key={g.id}>
        <DroppableWrap refNode={ref}>
          {({ setRef, isOver }) => (
            <div
              ref={setRef}
              onClick={() => {
                selection.select(ref);
                toggle(groupKey);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 12px 8px 30px",
                background: isOver
                  ? "var(--c-accent-soft, var(--c-surface-3))"
                  : sel
                  ? "var(--c-accent-soft, var(--c-surface-2))"
                  : "transparent",
                borderLeft:
                  sel || isOver ? "3px solid var(--c-accent)" : "3px solid transparent",
                borderBottom: "1px solid var(--c-line)",
                cursor: "pointer",
              }}
            >
              <Icon
                name="chevron-right"
                size={13}
                style={{
                  color: "var(--c-ink-3)",
                  transform: open ? "rotate(90deg)" : "none",
                  transition: "transform .12s",
                  flex: "none",
                }}
              />
              <Icon name={meta.icon} size={14} style={{ color: "var(--c-ink-3)", flex: "none" }} />
              <span style={{ fontWeight: 660, fontSize: "var(--fz)" }}>{g.name}</span>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--c-ink-4)",
                  background: "var(--c-surface-3)",
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                {meta.label}
              </span>
              <span
                className={`badge ${lcMeta.cls}`}
                style={{ marginLeft: "auto", fontSize: 10 }}
              >
                <span className={`dot ${lcMeta.dot}`} />
                {lcMeta.label}
              </span>
            </div>
          )}
        </DroppableWrap>
        {open && g.panels.map((p) => renderPanel(p))}
        {open && onCreatePanel && (
          <InlineAddRow
            label={g.panels.length === 0 ? "Add first panel" : "Add panel"}
            icon="zap"
            indent={58}
            placeholder="Panel name (Enter to save · Shift+Enter for next)"
            onCreate={(name) => onCreatePanel({ system_group_id: g.id, name })}
          />
        )}
      </Fragment>
    );
  }

  function renderPanel(p: Panel) {
    const panelKey = `panel:${p.id}`;
    const open = !collapsed[panelKey];
    const ref: NodeRef = { kind: "panel", id: p.id };
    const sel = selection.isSelected(ref);
    const cabinets = p.cabinets ?? [];
    return (
      <Fragment key={p.id}>
        <DroppableWrap refNode={ref}>
          {({ setRef: setDropRef, isOver }) => (
            <DraggableRow refNode={ref}>
              {({ setRef: setDragRef, listeners, attributes, isDragging }) => (
                <div
                  ref={(el) => {
                    setDropRef(el);
                    setDragRef(el);
                  }}
                  {...attributes}
                  {...listeners}
                  onClick={() => selection.select(ref)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "7px 12px 7px 78px",
                    cursor: "grab",
                    opacity: isDragging ? 0.4 : 1,
                    background: isOver
                      ? "var(--c-accent-soft, var(--c-surface-3))"
                      : sel
                      ? "var(--c-accent-soft, var(--c-surface-2))"
                      : "transparent",
                    borderLeft:
                      sel || isOver ? "3px solid var(--c-accent)" : "3px solid transparent",
                    borderBottom: "1px solid var(--c-line)",
                  }}
                >
                  {cabinets.length > 0 ? (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(panelKey);
                      }}
                      style={{ display: "inline-flex", flex: "none" }}
                    >
                      <Icon
                        name="chevron-right"
                        size={12}
                        style={{
                          color: "var(--c-ink-4)",
                          transform: open ? "rotate(90deg)" : "none",
                          transition: "transform .12s",
                        }}
                      />
                    </span>
                  ) : (
                    <span style={{ width: 12, flex: "none" }} />
                  )}
                  <Icon name="zap" size={13} style={{ color: "var(--c-ink-3)", flex: "none" }} />
                  <span style={{ fontWeight: 600, fontSize: "var(--fz)" }}>{p.tag}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--c-ink-3)",
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </span>
                  {p.rev && (
                    <span className="mono" style={{ fontSize: 10, color: "var(--c-ink-4)" }}>
                      rev {p.rev}
                    </span>
                  )}
                </div>
              )}
            </DraggableRow>
          )}
        </DroppableWrap>
        {open &&
          cabinets.map((c) => renderCabinet(c))}
        {open && onCreateCabinet && (
          <InlineAddRow
            label={cabinets.length === 0 ? "Add first cabinet" : "Add cabinet"}
            icon="box"
            indent={110}
            placeholder="Cabinet name (C1, Incoming, …)"
            onCreate={(name) => onCreateCabinet({ panel_id: p.id, name })}
          />
        )}
      </Fragment>
    );
  }

  function renderCabinet(c: Cabinet) {
    const ref: NodeRef = { kind: "cabinet", id: c.id };
    const sel = selection.isSelected(ref);
    return (
      <DraggableRow key={c.id} refNode={ref}>
        {({ setRef, listeners, attributes, isDragging }) => (
          <div
            ref={setRef}
            {...attributes}
            {...listeners}
            onClick={() => selection.select(ref)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px 6px 110px",
              cursor: "grab",
              opacity: isDragging ? 0.4 : 1,
              background: sel ? "var(--c-accent-soft, var(--c-surface-2))" : "transparent",
              borderLeft: sel ? "3px solid var(--c-accent)" : "3px solid transparent",
              borderBottom: "1px solid var(--c-line)",
            }}
          >
            <Icon name="box" size={12} style={{ color: "var(--c-ink-4)", flex: "none" }} />
            <span style={{ fontSize: 12, color: "var(--c-ink-2)" }}>{c.name}</span>
            {c.code && (
              <span
                className="mono"
                style={{
                  fontSize: 9.5,
                  color: "var(--c-ink-4)",
                  background: "var(--c-surface-3)",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                {c.code}
              </span>
            )}
          </div>
        )}
      </DraggableRow>
    );
  }
}
