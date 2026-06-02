"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { StatusBadge } from "@/components/primitives/status-badge";
import { Empty } from "@/components/primitives/empty";
import { SECTION_TYPE_META } from "@/lib/api/adapters";
import type { PanelStatus } from "@/lib/utils/status";
import type { Panel, PanelSetNode } from "@/lib/api/types";

const STATUS_ORDER: PanelStatus[] = [
  "draft",
  "engineering",
  "released",
  "installed",
  "commissioned",
  "in_service",
  "archived",
];

function statusCounts(panels: Panel[]): Record<PanelStatus, number> {
  const c: Record<PanelStatus, number> = {
    draft: 0,
    engineering: 0,
    released: 0,
    installed: 0,
    commissioned: 0,
    in_service: 0,
    archived: 0,
  };
  for (const p of panels) c[p.status]++;
  return c;
}

export interface PanelTreeProps {
  sets: PanelSetNode[];
  unassigned: Panel[];
  /** Link prefix (e.g. "/demo"). Default "" = production. */
  basePath?: string;
}

export function PanelTree({ sets, unassigned, basePath = "" }: PanelTreeProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const groups: { key: string; name: string; code?: string; panels: Panel[] }[] = [
    ...sets.map((s) => ({ key: `set:${s.id}`, name: s.name, code: s.code, panels: s.panels })),
    ...(unassigned.length
      ? [{ key: "set:unassigned", name: "Unassigned panels", code: undefined, panels: unassigned }]
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
        return (
          <Fragment key={g.key}>
            {/* Panel Set row */}
            <div
              onClick={() => toggle(g.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "9px 12px",
                background: "var(--c-surface-2)",
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

            {/* Panels + sections */}
            {setOpen &&
              g.panels.map((p) => {
                const panelKey = `panel:${p.id}`;
                const panelOpen = !collapsed[panelKey];
                const sections = p.sections ?? [];
                return (
                  <Fragment key={p.id}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        padding: "8px 12px 8px 30px",
                        borderBottom: "1px solid var(--c-line)",
                        cursor: "pointer",
                      }}
                      onClick={() => router.push(`${basePath}/panels/${p.id}` as never)}
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
                      <span style={{ fontSize: 11, color: "var(--c-ink-3)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </span>
                      {p.rev && (
                        <span className="mono" style={{ fontSize: 10, color: "var(--c-ink-4)" }}>
                          rev {p.rev}
                        </span>
                      )}
                      <StatusBadge status={p.status} />
                    </div>

                    {panelOpen &&
                      sections.map((s) => {
                        const meta = SECTION_TYPE_META[s.section_type];
                        return (
                          <div
                            key={s.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "6px 12px 6px 58px",
                              borderBottom: "1px solid var(--c-line)",
                            }}
                          >
                            <Icon name={meta.icon} size={13} style={{ color: "var(--c-ink-4)", flex: "none" }} />
                            <span style={{ fontSize: 12, color: "var(--c-ink-2)" }}>{s.name}</span>
                            <span
                              className="mono"
                              style={{ fontSize: 9.5, color: "var(--c-ink-4)", background: "var(--c-surface-3)", padding: "1px 5px", borderRadius: 3 }}
                            >
                              {meta.label}
                            </span>
                          </div>
                        );
                      })}
                  </Fragment>
                );
              })}
          </Fragment>
        );
      })}
    </div>
  );
}
