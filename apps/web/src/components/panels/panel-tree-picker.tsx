"use client";

/**
 * Hierarchical panel picker. Replaces a flat <Select> when the caller needs to
 * choose a panel from the Project → System Group → Panel tree. Opens as a
 * popover anchored under the trigger button.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Btn } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Icon } from "@/components/icons/icon";
import { useTree } from "@/lib/query/hooks";
import { GROUP_TYPE_META } from "@/lib/api/adapters";
import type { Panel } from "@/lib/api/types";

export interface PanelTreePickerProps {
  value: string;
  onChange: (panelId: string) => void;
  placeholder?: string;
}

export function PanelTreePicker({ value, onChange, placeholder = "Select a panel" }: PanelTreePickerProps) {
  const { data: tree } = useTree();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement | null>(null);

  // Click-outside close.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const allPanels: Panel[] = useMemo(() => {
    if (!tree) return [];
    return [
      ...tree.projects.flatMap((p) => p.groups.flatMap((g) => g.panels)),
      ...tree.unassigned,
    ];
  }, [tree]);

  const selected = allPanels.find((p) => p.id === value);

  const matches = (text: string) => !q || text.toLowerCase().includes(q.toLowerCase());

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          background: "var(--c-surface)",
          border: "1px solid var(--c-line)",
          borderRadius: 6,
          fontSize: "var(--fz)",
          cursor: "pointer",
          minWidth: 220,
          color: "var(--c-ink-1)",
        }}
      >
        <Icon name="layout-grid" size={13} style={{ color: "var(--c-ink-3)" }} />
        {selected ? (
          <span style={{ display: "inline-flex", gap: 6 }}>
            <span className="mono">{selected.tag}</span>
            <span style={{ color: "var(--c-ink-3)" }}>· {selected.name}</span>
          </span>
        ) : (
          <span style={{ color: "var(--c-ink-3)" }}>{placeholder}</span>
        )}
        <Icon name="chevron-down" size={12} style={{ marginLeft: "auto", color: "var(--c-ink-3)" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: 340,
            maxHeight: 440,
            background: "var(--c-surface)",
            border: "1px solid var(--c-line)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,.12)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid var(--c-line)" }}>
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by tag or name…"
            />
          </div>
          <div style={{ overflow: "auto", padding: 4, flex: 1 }}>
            {!tree && (
              <div style={{ padding: 10, fontSize: 12, color: "var(--c-ink-3)" }}>Loading…</div>
            )}
            {tree?.projects.map((proj) => {
              const projKey = `p:${proj.id}`;
              const projOpen = collapsed[projKey] !== true;
              // Skip a project if its subtree has no matches.
              const projVisible =
                !q ||
                matches(proj.name) ||
                proj.groups.some(
                  (g) =>
                    matches(g.name) || g.panels.some((p) => matches(p.tag) || matches(p.name)),
                );
              if (!projVisible) return null;
              return (
                <div key={proj.id}>
                  <Row
                    indent={0}
                    icon="building"
                    open={projOpen}
                    onToggle={() => setCollapsed((c) => ({ ...c, [projKey]: projOpen }))}
                    title={proj.name}
                    sub={`${proj.groups.length} groups`}
                  />
                  {projOpen &&
                    proj.groups.map((g) => {
                      const gKey = `g:${g.id}`;
                      const gOpen = collapsed[gKey] !== true;
                      const gVisible =
                        !q ||
                        matches(g.name) ||
                        g.panels.some((p) => matches(p.tag) || matches(p.name));
                      if (!gVisible) return null;
                      const meta = GROUP_TYPE_META[g.group_type];
                      return (
                        <div key={g.id}>
                          <Row
                            indent={1}
                            icon={meta.icon}
                            open={gOpen}
                            onToggle={() => setCollapsed((c) => ({ ...c, [gKey]: gOpen }))}
                            title={g.name}
                            sub={meta.label}
                          />
                          {gOpen &&
                            g.panels
                              .filter((p) => !q || matches(p.tag) || matches(p.name))
                              .map((p) => (
                                <PanelRow
                                  key={p.id}
                                  panel={p}
                                  active={p.id === value}
                                  indent={2}
                                  onPick={() => {
                                    onChange(p.id);
                                    setOpen(false);
                                  }}
                                />
                              ))}
                        </div>
                      );
                    })}
                </div>
              );
            })}
            {tree?.unassigned && tree.unassigned.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <Row indent={0} icon="alert-triangle" title="Unassigned" sub={`${tree.unassigned.length} panels`} />
                {tree.unassigned
                  .filter((p) => !q || matches(p.tag) || matches(p.name))
                  .map((p) => (
                    <PanelRow
                      key={p.id}
                      panel={p}
                      active={p.id === value}
                      indent={1}
                      onPick={() => {
                        onChange(p.id);
                        setOpen(false);
                      }}
                    />
                  ))}
              </div>
            )}
            {tree && tree.projects.length === 0 && tree.unassigned.length === 0 && (
              <div style={{ padding: 10, fontSize: 12, color: "var(--c-ink-3)" }}>
                No panels yet.
              </div>
            )}
          </div>
          <div
            style={{
              padding: "6px 10px",
              borderTop: "1px solid var(--c-line)",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Btn size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  indent,
  icon,
  open,
  onToggle,
  title,
  sub,
}: {
  indent: number;
  icon: Parameters<typeof Icon>[0]["name"];
  open?: boolean;
  onToggle?: () => void;
  title: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 8px",
        paddingLeft: 8 + indent * 14,
        color: "var(--c-ink-2)",
        fontSize: 12,
        userSelect: "none",
      }}
    >
      {onToggle ? (
        <button
          onClick={onToggle}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--c-ink-3)",
            cursor: "pointer",
            padding: 0,
            display: "inline-flex",
          }}
        >
          <Icon name={open ? "chevron-down" : "chevron-right"} size={12} />
        </button>
      ) : (
        <span style={{ width: 12 }} />
      )}
      <Icon name={icon} size={13} style={{ color: "var(--c-ink-3)" }} />
      <span style={{ fontWeight: 600 }}>{title}</span>
      {sub && <span style={{ color: "var(--c-ink-3)", fontSize: 11 }}>· {sub}</span>}
    </div>
  );
}

function PanelRow({
  panel,
  active,
  indent,
  onPick,
}: {
  panel: Panel;
  active: boolean;
  indent: number;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "5px 8px",
        paddingLeft: 8 + indent * 14 + 12,
        background: active ? "var(--c-surface-2)" : "transparent",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        fontSize: 12,
        color: "var(--c-ink-1)",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "var(--c-surface-2)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      <Icon name="server" size={12} style={{ color: "var(--c-accent)" }} />
      <span className="mono">{panel.tag}</span>
      <span style={{ color: "var(--c-ink-3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {panel.name}
      </span>
      {active && <Icon name="check" size={12} style={{ color: "var(--c-accent)" }} />}
    </button>
  );
}
