"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/icon";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  num?: boolean;
  sortValue?: (row: T) => string | number | Date;
  width?: number | string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selected?: string[];
  emptyText?: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  selected,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);

  const sorted = (() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  })();

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  return (
    <table className="tbl">
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              className={c.sortValue ? "sortable" : undefined}
              style={{ textAlign: c.num ? "right" : "left", width: c.width }}
              onClick={c.sortValue ? () => toggleSort(c.key) : undefined}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {c.header}
                {sort?.key === c.key && (
                  <Icon
                    name="chevron-down"
                    size={11}
                    style={{ transform: sort.dir === "asc" ? "rotate(180deg)" : "none" }}
                  />
                )}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => {
          const key = rowKey(row);
          const isSel = selected?.includes(key);
          return (
            <tr
              key={key}
              className={isSel ? "sel" : undefined}
              style={{ cursor: onRowClick ? "pointer" : undefined }}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={c.num ? "num" : undefined}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
