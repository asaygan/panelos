"use client";

import { Badge } from "@/components/primitives/badge";
import { Empty } from "@/components/primitives/empty";
import { Icon } from "@/components/icons/icon";
import { ROLE_LABEL, ROLE_TONE } from "./role-meta";
import type { RoleView } from "@/lib/api/types";

export interface RolesCardProps {
  roles: RoleView[];
  loading?: boolean;
}

export function RolesCard({ roles, loading }: RolesCardProps) {
  if (loading) return <Empty icon="shield" title="Loading roles…" />;
  if (roles.length === 0) return <Empty icon="shield" title="No roles available" />;

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {roles.map((r) => (
        <div
          key={r.role}
          style={{ border: "1px solid var(--c-line)", borderRadius: "var(--r-sm)", padding: 11 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <Badge tone={ROLE_TONE[r.role]} dot>
              {ROLE_LABEL[r.role] ?? r.label}
            </Badge>
            <span style={{ fontSize: 11, color: "var(--c-ink-4)", marginLeft: "auto" }}>
              {r.memberCount} {r.memberCount === 1 ? "member" : "members"}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {r.permissions.slice(0, 8).map((p) => (
              <span
                key={p.key}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 10.5,
                  color: "var(--c-ink-2)",
                }}
              >
                <Icon name="check" size={11} style={{ color: "var(--c-ok)" }} />
                {p.label}
              </span>
            ))}
            {r.permissions.length > 8 && (
              <span style={{ fontSize: 10.5, color: "var(--c-ink-4)" }}>
                +{r.permissions.length - 8} more
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
