"use client";

import { Fragment, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Icon } from "@/components/icons/icon";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Empty } from "@/components/primitives/empty";
import { SECTION_TYPE_META } from "@/lib/api/adapters";
import type { Panel, PanelSetNode } from "@/lib/api/types";
import type { PanelStatus } from "@/lib/utils/status";
import { InlineAddRow } from "./inline-add-row";
import type { NodeRef, SelectionApi } from "./selection";

/** dnd-kit id format: `<kind>:<id>`. The `data` payload carries the kind+id too. */
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
  children: (args: {
    setRef: (el: HTMLElement | null) => void;
    isOver: boolean;
  }) => React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `drop:${dragId(refNode)}`,
    data: refNode,
  });
  return <>{children({ setRef: setNodeRef, isOver })}</>;
}

const STATUS_ORDER: PanelStatus[] = ["fault", "warn", "ok", "idle"];

function statusCounts(panels: Panel[]): Record<PanelStatus, number> {
  const c: Record<PanelStatus, number> = { ok: 0, warn: 0, fault: 0, idle: 0 };
  for (const p of panels) c[p.status]++;
  return c;
}

export interface PanelTreeEditorProps {
  sets: PanelSetNode[];
  unassigned: Panel[];
  selection: SelectionApi;
  /** Inline quick-create: returns the new panel id (used to keep selection sane). */
  onCreatePanel?: (args: { name: string; panel_set_id: string | null }) => Promise<unknown>;
  onCreateSection?: (args: { panel_id: string; name: string }) => Promise<unknown>;
}

/** Selectable, collapsible 3-level tree (Set → Panel → Section).
 *
 * Phase 2: row click selects (drives the right detail panel). Chevron toggles.
 * Phase 3 will add inline "+ Add Panel"/"+ Add Section" rows.
 * Phase 5 will wrap rows with @dnd-kit draggable/droppable.
 */
export function PanelTreeEditor({
  sets,
  unassigned,
  selection,
  onCreatePanel,
  onCreateSection,
}: PanelTreeEditorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const groups: { key: string; ref: NodeRef | null; name: string; code?: string; panels: Panel[] }[] = [
    ...sets.map((s) => ({
      key: `set:${s.id}`,
      ref: { kind: "set" as const, id: s.id },
      name: s.name,
      code: s.code,
      panels: s.panels,
    })),
    ...(unassigned.length
      ? [{ key: "set:unassigned", ref: null, name: "Unassigned panels", code: undefined, panels: unassigned }]
      : []),
  ];

  if (groups.length === 0) {
    return (
      <Empty
        icon="layout-grid"
        title="No panel sets yet"
        sub="Create a panel set (a facility or system) to start organizing panels."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {groups.map((g) => {
        const setOpen = !collapsed[g.key];
        const counts = statusCounts(g.panels);
        const setSelected = g.ref ? selection.isSelected(g.ref) : false;
        return (
          <Fragment key={g.key}>
            {/* Panel Set row (droppable for panels) */}
            <DroppableWrap refNode={g.ref ?? { kind: "set", id: "unassigned" }}>
              {({ setRef, isOver }) => (
            <div
              ref={setRef}
              onClick={() => {
                if (g.ref) selection.select(g.ref);
                toggle(g.key);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 12px",
                background: isOver
                  ? "var(--c-accent-soft, var(--c-surface-3))"
                  : setSelected
                  ? "var(--c-accent-soft, var(--c-surface-2))"
                  : "var(--c-surface-2)",
                borderLeft: setSelected
                  ? "3px solid var(--c-accent)"
                  : isOver
                  ? "3px solid var(--c-accent)"
                  : "3px solid transparent",
                borderBottom: "1px solid var(--c-line-strong)",
                cursor: "pointer",
              }}
            >
              <Icon
                name="chevron-right"
                size={14}
                style={{
                  color: "var(--c-ink-3)",
                  transform: setOpen ? "rotate(90deg)" : "none",
                  transition: "transform .12s",
                  flex: "none",
                }}
              />
              <Icon name="layout-grid" size={14} style={{ color: "var(--c-accent)", flex: "none" }} />
              <span style={{ fontWeight: 680, fontSize: "var(--fz)" }}>{g.name}</span>
              {g.code && (
                <span className="mono" style={{ fontSize: 10, color: "var(--c-ink-4)" }}>
                  {g.code}
                </span>
              )}
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--c-ink-3)",
                  background: "var(--c-surface-3)",
                  padding: "1px 6px",
                  borderRadius: 4,
                }}
              >
                {g.panels.length} {g.panels.length === 1 ? "panel" : "panels"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: 4 }}>
                {STATUS_ORDER.map((s) =>
                  counts[s] > 0 ? (
                    <span
                      key={s}
                      style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, color: "var(--c-ink-3)" }}
                    >
                      <span className={`dot dot-${s}`} style={{ width: 6, height: 6, borderRadius: "50%" }} />
                      {counts[s]}
                    </span>
                  ) : null,
                )}
              </div>
            </div>
              )}
            </DroppableWrap>

            {setOpen &&
              g.panels.map((p) => {
                const panelKey = `panel:${p.id}`;
                const panelOpen = !collapsed[panelKey];
                const sections = p.sections ?? [];
                const panelRef: NodeRef = { kind: "panel", id: p.id };
                const panelSelected = selection.isSelected(panelRef);
                return (
                  <Fragment key={p.id}>
                    <DroppableWrap refNode={panelRef}>
                      {({ setRef: setDropRef, isOver }) => (
                    <DraggableRow refNode={panelRef}>
                      {({ setRef: setDragRef, listeners, attributes, isDragging }) => (
                    <div
                      ref={(el) => {
                        setDropRef(el);
                        setDragRef(el);
                      }}
                      {...attributes}
                      {...listeners}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "8px 12px 8px 30px",
                        borderBottom: "1px solid var(--c-line)",
                        cursor: "grab",
                        opacity: isDragging ? 0.4 : 1,
                        background: isOver
                          ? "var(--c-accent-soft, var(--c-surface-3))"
                          : panelSelected
                          ? "var(--c-accent-soft, var(--c-surface-2))"
                          : "transparent",
                        borderLeft: panelSelected
                          ? "3px solid var(--c-accent)"
                          : isOver
                          ? "3px solid var(--c-accent)"
                          : "3px solid transparent",
                      }}
                      onClick={() => selection.select(panelRef)}
                    >
                      {sections.length > 0 ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(panelKey);
                          }}
                          style={{ display: "inline-flex", flex: "none" }}
                        >
                          <Icon
                            name="chevron-right"
                            size={13}
                            style={{
                              color: "var(--c-ink-4)",
                              transform: panelOpen ? "rotate(90deg)" : "none",
                              transition: "transform .12s",
                            }}
                          />
                        </span>
                      ) : (
                        <span style={{ width: 13, flex: "none" }} />
                      )}
                      <Icon name="zap" size={14} style={{ color: "var(--c-ink-3)", flex: "none" }} />
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
                      <StatusBadge status={p.status} />
                    </div>
                      )}
                    </DraggableRow>
                      )}
                    </DroppableWrap>

                    {panelOpen && (
                      <>
                        {sections.map((s) => {
                          const meta = SECTION_TYPE_META[s.section_type];
                          const sRef: NodeRef = { kind: "section", id: s.id };
                          const sSelected = selection.isSelected(sRef);
                          return (
                            <DraggableRow refNode={sRef} key={s.id}>
                              {({ setRef, listeners, attributes, isDragging }) => (
                            <div
                              ref={setRef}
                              {...attributes}
                              {...listeners}
                              onClick={() => selection.select(sRef)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "6px 12px 6px 58px",
                                borderBottom: "1px solid var(--c-line)",
                                cursor: "grab",
                                opacity: isDragging ? 0.4 : 1,
                                background: sSelected
                                  ? "var(--c-accent-soft, var(--c-surface-2))"
                                  : "transparent",
                                borderLeft: sSelected
                                  ? "3px solid var(--c-accent)"
                                  : "3px solid transparent",
                              }}
                            >
                              <Icon
                                name={meta.icon}
                                size={13}
                                style={{ color: "var(--c-ink-4)", flex: "none" }}
                              />
                              <span style={{ fontSize: 12, color: "var(--c-ink-2)" }}>{s.name}</span>
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
                                {meta.label}
                              </span>
                            </div>
                              )}
                            </DraggableRow>
                          );
                        })}
                        {onCreateSection && (
                          <InlineAddRow
                            label={sections.length === 0 ? "Add first section" : "Add section"}
                            icon="plus"
                            indent={58}
                            placeholder="Section name (Enter to save)"
                            onCreate={(name) => onCreateSection({ panel_id: p.id, name })}
                          />
                        )}
                      </>
                    )}
                  </Fragment>
                );
              })}
            {setOpen && onCreatePanel && g.ref?.kind === "set" && (
              <InlineAddRow
                label={g.panels.length === 0 ? "Add first panel" : "Add panel"}
                icon="zap"
                indent={30}
                placeholder="Panel name (Enter to save · Shift+Enter for next)"
                onCreate={(name) => onCreatePanel({ name, panel_set_id: g.ref!.id })}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
