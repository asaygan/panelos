import type { Component } from "@/lib/api/types";
import { Badge } from "@/components/primitives/badge";

export function PanelComponentsTable({ comps }: { comps: Component[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Slot</th>
          <th>Ref</th>
          <th>Description</th>
          <th>Part number</th>
          <th>Rating</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {comps.map((c) => (
          <tr key={c.ref}>
            <td className="mono strong">{c.slot}</td>
            <td className="mono" style={{ color: "var(--c-accent-ink)" }}>
              {c.ref}
            </td>
            <td className="strong">{c.desc}</td>
            <td className="mono" style={{ color: "var(--c-ink-2)" }}>
              {c.part}
            </td>
            <td className="mono">{c.rating}</td>
            <td>
              <Badge tone="idle">{c.type}</Badge>
            </td>
            <td>
              <span className={`badge badge-${c.status === "warn" ? "warn" : "ok"}`}>
                <span className={`dot dot-${c.status === "warn" ? "warn" : "ok"}`} />
                {c.status === "warn" ? "Check" : "OK"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
