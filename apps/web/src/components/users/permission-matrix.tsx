"use client";

import { Icon } from "@/components/icons/icon";
import { Empty } from "@/components/primitives/empty";
import { ROLE_LABEL, ROLE_ORDER } from "./role-meta";
import type { Role, RoleView } from "@/lib/api/types";

export interface PermissionMatrixProps {
  roles: RoleView[];
  loading?: boolean;
}

export function PermissionMatrix({ roles, loading }: PermissionMatrixProps) {
  if (loading) return <Empty icon="shield" title="Loading permissions…" />;
  if (roles.length === 0) return <Empty icon="shield" title="No roles available" />;

  // Union of permission keys (preserve first-seen order, owner usually has all).
  const byRole = new Map<Role, Set<string>>();
  const labelByKey = new Map<string, string>();
  const orderedKeys: string[] = [];
  for (const r of roles) {
    const set = new Set<string>();
    for (const p of r.permissions) {
      set.add(p.key);
      if (!labelByKey.has(p.key)) {
        labelByKey.set(p.key, p.label);
        orderedKeys.push(p.key);
      }
    }
    byRole.set(r.role, set);
  }

  const columns = ROLE_ORDER.filter((r) => byRole.has(r));

  return (
    <div style={{ padding: 12 }}>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Permission</th>
              {columns.map((r) => (
                <th key={r} style={{ textAlign: "center" }}>
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orderedKeys.map((key) => (
              <tr key={key}>
                <td style={{ fontSize: 12 }}>{labelByKey.get(key)}</td>
                {columns.map((r) => {
                  const has = byRole.get(r)?.has(key);
                  return (
                    <td key={r} style={{ textAlign: "center" }}>
                      {has ? (
                        <Icon name="check" size={13} style={{ color: "var(--c-ok)" }} />
                      ) : (
                        <span style={{ color: "var(--c-ink-5, var(--c-ink-4))" }}>·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div
        style={{
          marginTop: 12,
          fontSize: "var(--fz-xs)",
          color: "var(--c-ink-4)",
          fontStyle: "italic",
        }}
      >
        Custom roles available in the Enterprise plan.
      </div>
    </div>
  );
}
