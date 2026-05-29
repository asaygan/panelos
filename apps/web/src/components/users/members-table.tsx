"use client";

import { Avatar } from "@/components/primitives/avatar";
import { Badge } from "@/components/primitives/badge";
import { Menu, type MenuEntry } from "@/components/primitives/menu";
import { Btn } from "@/components/primitives/button";
import { computeGuards, type ActorContext } from "./guards";
import { ROLE_LABEL, ROLE_TONE, STATUS_LABEL, STATUS_TONE } from "./role-meta";
import type { Member } from "@/lib/api/types";

export interface MemberActions {
  onView: (m: Member) => void;
  onChangeRole: (m: Member) => void;
  onAssignLocations: (m: Member) => void;
  onResend: (m: Member) => void;
  onToggleStatus: (m: Member, next: "active" | "suspended") => void;
  onRemove: (m: Member) => void;
}

export interface MembersTableProps {
  members: Member[];
  actor: ActorContext | null;
  actions: MemberActions;
}

export function MembersTable({ members, actor, actions }: MembersTableProps) {
  const activeOwnerCount = members.filter(
    (m) => m.role === "owner" && m.status === "active",
  ).length;

  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>Member</th>
          <th>Role</th>
          <th>Status</th>
          <th>Scope</th>
          <th>Last active</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {members.map((m) => {
          const g = computeGuards(m, actor, activeOwnerCount);
          const items: MenuEntry[] = [{ label: "View details", icon: "eye", onClick: () => actions.onView(m) }];
          if (g.canChangeRole)
            items.push({ label: "Change role", icon: "shield", onClick: () => actions.onChangeRole(m) });
          if (g.canAssignLocations)
            items.push({ label: "Assign locations", icon: "map-pin", onClick: () => actions.onAssignLocations(m) });
          if (g.canResend)
            items.push({ label: "Resend invite", icon: "mail", onClick: () => actions.onResend(m) });
          if (g.canSuspend)
            items.push({ label: "Suspend", icon: "lock", onClick: () => actions.onToggleStatus(m, "suspended") });
          if (g.canActivate)
            items.push({ label: "Activate", icon: "check-circle", onClick: () => actions.onToggleStatus(m, "active") });
          if (g.canRemove) {
            items.push({ sep: true });
            items.push({ label: "Remove", icon: "x", danger: true, onClick: () => actions.onRemove(m) });
          }

          return (
            <tr key={m.membershipId}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <Avatar user={m} size={28} />
                  <div>
                    <div className="strong">{m.name}</div>
                    <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{m.email}</div>
                  </div>
                </div>
              </td>
              <td>
                <Badge tone={ROLE_TONE[m.role]} dot>
                  {ROLE_LABEL[m.role]}
                </Badge>
              </td>
              <td>
                <Badge tone={STATUS_TONE[m.status]} dot>
                  {STATUS_LABEL[m.status]}
                </Badge>
              </td>
              <td>
                {m.locations.length === 0 ? (
                  <span style={{ fontSize: 11, color: "var(--c-ink-3)" }}>Organization-wide</span>
                ) : (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {m.locations.slice(0, 3).map((l) => (
                      <span
                        key={l.id}
                        title={l.name}
                        style={{
                          fontSize: 10,
                          color: "var(--c-ink-2)",
                          background: "var(--c-surface-3)",
                          padding: "1px 6px",
                          borderRadius: 4,
                        }}
                      >
                        {l.code}
                      </span>
                    ))}
                    {m.locations.length > 3 && (
                      <span style={{ fontSize: 10, color: "var(--c-ink-4)" }}>
                        +{m.locations.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{m.lastActive}</td>
              <td>
                <Menu
                  align="end"
                  trigger={<Btn icon="more-horizontal" variant="ghost" size="sm" />}
                  items={items}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
