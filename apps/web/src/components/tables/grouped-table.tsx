"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/icon";
import type { PanelStatus } from "@/lib/utils/status";

export interface GroupedTableProps<T> {
  rows: T[];
  groupBy: keyof T | "none";
  renderRow: (row: T) => ReactNode;
  rowKey: (row: T) => string;
  header: ReactNode;
  getStatus?: (row: T) => PanelStatus;
  groupIcon?: "map-pin" | "cpu" | "box";
  groupLabel?: (key: string) => string;
  selectedIds?: string[];
  onSelectGroup?: (ids: string[], all: boolean) => void;
  colSpan: number;
}

export function GroupedTable<T>({
  rows,
  groupBy,
  renderRow,
  rowKey,
  header,
  getStatus,
  groupIcon,
  groupLabel,
  selectedIds,
  onSelectGroup,
  colSpan,
}: GroupedTableProps<T>) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, T[]>();
    rows.forEach((p) => {
      const k = String((p as Record<string, unknown>)[groupBy as string] ?? "—");
      const arr = map.get(k);
      if (arr) arr.push(p);
      else map.set(k, [p]);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [rows, groupBy]);

  return (
    <table className="tbl">
      {header}
      <tbody>
        {grouped == null
          ? rows.map((r) => <Fragment key={rowKey(r)}>{renderRow(r)}</Fragment>)
          : grouped.map(([key, items]) => {
              const isOpen = !collapsed[key];
              const ids = items.map(rowKey);
              const allSel = selectedIds ? ids.every((id) => selectedIds.includes(id)) : false;
              const counts: Record<PanelStatus, number> = {
                draft: 0,
                engineering: 0,
                released: 0,
                installed: 0,
                commissioned: 0,
                in_service: 0,
                archived: 0,
              };
              if (getStatus) items.forEach((i) => counts[getStatus(i)]++);
              return (
                <Fragment key={key}>
                  <tr
                    style={{ background: "var(--c-surface-2)", cursor: "pointer" }}
                    onClick={() => setCollapsed((c) => ({ ...c, [key]: !c[key] }))}
                  >
                    <td
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGroup?.(ids, !allSel);
                      }}
                    >
                      <input type="checkbox" checked={allSel} readOnly />
                    </td>
                    <td colSpan={colSpan} style={{ borderBottom: "1px solid var(--c-line-strong)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <Icon
                          name="chevron-right"
                          size={14}
                          style={{
                            color: "var(--c-ink-3)",
                            transform: isOpen ? "rotate(90deg)" : "none",
                            transition: "transform .12s",
                          }}
                        />
                        {groupIcon && (
                          <Icon name={groupIcon} size={13} style={{ color: "var(--c-ink-3)" }} />
                        )}
                        <span style={{ fontWeight: 660, color: "var(--c-ink)", fontSize: "var(--fz)" }}>
                          {groupLabel ? groupLabel(key) : key}
                        </span>
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
                          {items.length}
                        </span>
                        {getStatus && (
                          <div style={{ display: "flex", alignItems: "center", gap: 7, marginLeft: 6 }}>
                            {(["draft", "engineering", "released", "installed", "commissioned", "in_service", "archived"] as const).map((s) =>
                              counts[s] > 0 ? (
                                <span
                                  key={s}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontSize: 10.5,
                                    color: "var(--c-ink-3)",
                                  }}
                                >
                                  <span
                                    className={`dot dot-${s}`}
                                    style={{ width: 6, height: 6, borderRadius: "50%" }}
                                  />
                                  {counts[s]}
                                </span>
                              ) : null,
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && items.map((r) => <Fragment key={rowKey(r)}>{renderRow(r)}</Fragment>)}
                </Fragment>
              );
            })}
      </tbody>
    </table>
  );
}
