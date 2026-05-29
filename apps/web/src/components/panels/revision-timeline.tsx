"use client";

import type { Revision } from "@/lib/api/types";
import { Badge } from "@/components/primitives/badge";
import { Btn } from "@/components/primitives/button";
import { Icon } from "@/components/icons/icon";
import { REV_STATUS_META } from "@/lib/utils/status";
import { Card } from "@/components/primitives/card";

export interface RevisionTimelineProps {
  revs: Revision[];
  onView?: () => void;
}

export function RevisionTimeline({ revs, onView }: RevisionTimelineProps) {
  return (
    <div style={{ position: "relative", paddingLeft: 4 }}>
      {revs.map((r, i) => {
        const meta = REV_STATUS_META[r.status];
        const isHead = i === 0;
        return (
          <div
            key={r.rev}
            style={{
              display: "flex",
              gap: 12,
              position: "relative",
              paddingBottom: i < revs.length - 1 ? 16 : 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flex: "none",
                width: 28,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  display: "grid",
                  placeItems: "center",
                  flex: "none",
                  background: isHead ? "var(--c-accent)" : "var(--c-surface)",
                  color: isHead ? "#fff" : "var(--c-ink-2)",
                  border: isHead ? "none" : "1px solid var(--c-line-strong)",
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: "var(--mono)",
                }}
              >
                {r.rev}
              </div>
              {i < revs.length - 1 && (
                <div style={{ width: 2, flex: 1, background: "var(--c-line)", marginTop: 4 }} />
              )}
            </div>
            <Card style={{ flex: 1, padding: 11, marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <span style={{ fontWeight: 640, fontSize: 12.5 }}>Revision {r.rev}</span>
                <Badge tone={meta.tone} dot>
                  {meta.label}
                </Badge>
                {isHead && <Badge tone="accent">Current</Badge>}
                <span
                  className="mono"
                  style={{ marginLeft: "auto", fontSize: 11, color: "var(--c-ink-4)" }}
                >
                  {r.date}
                </span>
              </div>
              <div style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-2)", lineHeight: 1.5 }}>
                {r.note}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--c-ink-3)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="pencil" size={12} />
                  {r.by}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="check-circle" size={12} />
                  Approved by {r.approver}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="file-text" size={12} />
                  {r.files} files
                </span>
                {onView && (
                  <Btn
                    size="sm"
                    variant="ghost"
                    icon="eye"
                    style={{ marginLeft: "auto" }}
                    onClick={onView}
                  >
                    View sheets
                  </Btn>
                )}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
