"use client";

import { Icon } from "@/components/icons/icon";
import { Empty } from "@/components/primitives/empty";
import type { AuditEntry } from "@/lib/api/types";

export interface AuditListProps {
  entries: AuditEntry[];
  loading?: boolean;
  error?: boolean;
}

function targetLabel(entry: AuditEntry): string {
  const meta = entry.meta;
  const email = meta.target_email ?? meta.email;
  if (typeof email === "string") return email;
  const name = meta.target_name ?? meta.name;
  if (typeof name === "string") return name;
  return "";
}

export function AuditList({ entries, loading, error }: AuditListProps) {
  if (loading) return <Empty icon="history" title="Loading activity…" />;
  if (error) return <Empty icon="alert-triangle" title="Couldn't load activity" />;
  if (entries.length === 0)
    return <Empty icon="history" title="No activity yet" sub="Member changes will appear here." />;

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {entries.map((a) => {
        const target = targetLabel(a);
        return (
          <div key={a.id} style={{ display: "flex", gap: 9 }}>
            <span
              style={{
                width: 24,
                height: 24,
                flex: "none",
                borderRadius: "50%",
                background: "var(--c-surface-3)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="history" size={12} style={{ color: "var(--c-ink-3)" }} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: "var(--c-ink-2)" }}>
                <span className="strong">{a.actor}</span> {a.actionLabel}
                {target && <span style={{ color: "var(--c-ink-3)" }}> · {target}</span>}
              </div>
              <div style={{ fontSize: 11, color: "var(--c-ink-4)" }}>{a.time}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
