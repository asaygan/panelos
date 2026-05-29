import type { ActivityItem } from "@/lib/api/types";
import { Icon, type IconName } from "@/components/icons/icon";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <div style={{ padding: "4px 0" }}>
      {items.map((a, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 9,
            padding: "9px 12px",
            borderBottom: i < items.length - 1 ? "1px solid var(--c-line)" : "none",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              flex: "none",
              display: "grid",
              placeItems: "center",
              background: `var(--c-${a.tone}-soft)`,
              color: `var(--c-${a.tone === "idle" ? "ink-3" : a.tone})`,
            }}
          >
            <Icon name={a.icon as IconName} size={13} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-2)", lineHeight: 1.45 }}>
              <span style={{ fontWeight: 640, color: "var(--c-ink)" }}>{a.who}</span> {a.act}{" "}
              <span className="mono" style={{ fontWeight: 600, color: "var(--c-ink)" }}>
                {a.target}
              </span>
            </div>
            <div
              style={{ fontSize: 11, color: "var(--c-ink-4)", display: "flex", gap: 6, marginTop: 1 }}
            >
              <span>{a.sub}</span>
              <span>·</span>
              <span>{a.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
