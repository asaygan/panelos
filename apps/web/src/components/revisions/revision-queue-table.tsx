"use client";

import { Badge } from "@/components/primitives/badge";
import { Btn } from "@/components/primitives/button";
import type { RevisionRequest } from "@/lib/api/types";
import { REV_STATUS_META } from "@/lib/utils/status";

export interface RevisionQueueTableProps {
  rows: RevisionRequest[];
  onOpen: (req: RevisionRequest) => void;
}

export function RevisionQueueTable({ rows, onOpen }: RevisionQueueTableProps) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Panel</th>
          <th>Change summary</th>
          <th>Rev</th>
          <th>Sheets</th>
          <th>By</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const m = REV_STATUS_META[r.status];
          return (
            <tr key={r.id}>
              <td>
                <span className="strong mono">{r.tag}</span>
                <div style={{ fontSize: 10, color: "var(--c-ink-4)" }}>{r.panel}</div>
              </td>
              <td style={{ maxWidth: 240, whiteSpace: "normal" }}>{r.note}</td>
              <td className="mono">
                {r.from}→{r.rev}
              </td>
              <td className="num">{r.sheets}</td>
              <td>{r.by.split(" ")[0]}</td>
              <td>
                <Badge tone={m.tone} dot>
                  {m.label}
                </Badge>
              </td>
              <td>
                <Btn size="sm" variant={r.status === "review" ? "primary" : "default"} onClick={() => onOpen(r)}>
                  {r.status === "review" ? "Review" : "Open"}
                </Btn>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
