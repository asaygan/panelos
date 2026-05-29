"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Avatar } from "@/components/primitives/avatar";
import { Badge } from "@/components/primitives/badge";
import { Btn } from "@/components/primitives/button";
import { Icon } from "@/components/icons/icon";
import { ROLE_LABEL, ROLE_TONE, STATUS_LABEL, STATUS_TONE } from "./role-meta";
import type { AuditEntry, Member } from "@/lib/api/types";

export interface UserDetailsDrawerProps {
  member: Member | null;
  audit: AuditEntry[];
  onClose: () => void;
}

export function UserDetailsDrawer({ member, audit, onClose }: UserDetailsDrawerProps) {
  const recent = member
    ? audit.filter((a) => a.targetId === member.membershipId).slice(0, 6)
    : [];

  return (
    <Dialog.Root open={!!member} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="card"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            maxWidth: "92vw",
            zIndex: 300,
            borderRadius: 0,
            borderLeft: "1px solid var(--c-line-strong)",
            display: "flex",
            flexDirection: "column",
            background: "var(--c-surface)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid var(--c-line)",
            }}
          >
            <Dialog.Title style={{ fontSize: 14, fontWeight: 660, margin: 0 }}>
              Member details
            </Dialog.Title>
            <Dialog.Close asChild>
              <Btn icon="x" variant="ghost" size="sm" />
            </Dialog.Close>
          </div>

          {member && (
            <div style={{ padding: 16, overflow: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar user={member} size={40} />
                <div>
                  <div className="strong" style={{ fontSize: 14 }}>
                    {member.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--c-ink-3)" }}>{member.email}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge tone={ROLE_TONE[member.role]} dot>
                  {ROLE_LABEL[member.role]}
                </Badge>
                <Badge tone={STATUS_TONE[member.status]} dot>
                  {STATUS_LABEL[member.status]}
                </Badge>
              </div>

              <Section title="Last active">
                <span style={{ fontSize: 12, color: "var(--c-ink-2)" }}>{member.lastActive}</span>
              </Section>

              <Section title="Assigned locations">
                {member.locations.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--c-ink-3)" }}>Organization-wide</span>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {member.locations.map((l) => (
                      <span
                        key={l.id}
                        style={{
                          fontSize: 11,
                          color: "var(--c-ink-2)",
                          background: "var(--c-surface-3)",
                          padding: "2px 7px",
                          borderRadius: 4,
                        }}
                      >
                        {l.code}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              <Section title="Recent activity">
                {recent.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--c-ink-3)" }}>No recent activity.</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {recent.map((a) => (
                      <div key={a.id} style={{ display: "flex", gap: 8, fontSize: 12 }}>
                        <Icon name="history" size={13} style={{ color: "var(--c-ink-4)", marginTop: 1 }} />
                        <div>
                          <span style={{ color: "var(--c-ink-2)" }}>
                            <span className="strong">{a.actor}</span> {a.actionLabel}
                          </span>
                          <div style={{ color: "var(--c-ink-4)", fontSize: 11 }}>{a.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label-cap" style={{ marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}
