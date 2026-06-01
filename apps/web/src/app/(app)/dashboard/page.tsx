"use client";

import { useRouter } from "next/navigation";
import { Page } from "@/components/primitives/page";
import { Card, CardHead } from "@/components/primitives/card";
import { Btn } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { StatusBadge } from "@/components/primitives/status-badge";
import { ActivityFeed } from "@/components/panels/activity-feed";
import { Icon, type IconName } from "@/components/icons/icon";
import { usePanels, useLocations, useRevisionQueue, useActivity } from "@/lib/query/hooks";

interface KPIProps {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  tone?: "ok" | "fault" | "idle";
  icon: IconName;
  spark: number[];
}

function KPI({ label, value, unit, delta, tone = "idle", icon, spark }: KPIProps) {
  return (
    <Card style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="label-cap">{label}</span>
        <Icon name={icon} size={15} style={{ color: "var(--c-ink-4)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          className="mono"
          style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1 }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: 12, color: "var(--c-ink-3)" }}>{unit}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {delta && (
          <span
            className="badge"
            style={{
              height: 17,
              padding: "0 5px",
              background:
                tone === "fault"
                  ? "var(--c-fault-soft)"
                  : tone === "ok"
                    ? "var(--c-ok-soft)"
                    : "var(--c-idle-soft)",
              color:
                tone === "fault"
                  ? "var(--c-fault)"
                  : tone === "ok"
                    ? "var(--c-ok)"
                    : "var(--c-ink-3)",
            }}
          >
            {delta}
          </span>
        )}
        <Spark data={spark} tone={tone} />
      </div>
    </Card>
  );
}

function Spark({ data, tone }: { data: number[]; tone: "ok" | "fault" | "idle" }) {
  const w = 92;
  const h = 22;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map(
      (d, i) =>
        `${(i / (data.length - 1)) * w},${h - ((d - min) / (max - min || 1)) * (h - 3) - 1.5}`,
    )
    .join(" ");
  const col = tone === "fault" ? "var(--c-fault)" : tone === "ok" ? "var(--c-ok)" : "var(--c-accent)";
  return (
    <svg width={w} height={h} style={{ marginLeft: "auto" }}>
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: panels = [] } = usePanels();
  const { data: locations = [] } = useLocations();
  const { data: queue = [] } = useRevisionQueue("all");
  const attention = panels.filter((p) => p.status !== "ok" || p.issues > 0).slice(0, 6);
  const activity = useActivity(attention.map((p) => p.id));

  const totalPanels = panels.length;
  const openFaults = panels.filter((p) => p.status === "fault").length;
  const revPending = queue.length;
  const revInReview = queue.filter((r) => r.status === "review").length;

  return (
    <Page>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--gap)",
          marginBottom: "var(--gap)",
        }}
      >
        <KPI label="Total panels" value={String(totalPanels)} tone="ok" icon="server" spark={[40, 42, 41, 44, 46, 45, 48, 52]} />
        <KPI label="Open faults" value={String(openFaults)} tone="fault" delta={openFaults ? "needs review" : undefined} icon="alert-triangle" spark={[1, 0, 2, 1, 3, 2, 4, 3]} />
        <KPI label="Revisions pending" value={String(revPending)} tone="idle" delta={revInReview ? `${revInReview} in review` : undefined} icon="git-branch" spark={[2, 3, 2, 4, 3, 5, 4, 4]} />
        <KPI label="Scans today" value={String(activity.length)} unit="field" tone="ok" icon="scan-line" spark={[20, 24, 18, 30, 28, 34, 31, 38]} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "var(--gap)" }}>
        <Card>
          <CardHead
            title={
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Panels needing attention
                <Badge tone="fault" dot>
                  {attention.length}
                </Badge>
              </span>
            }
            actions={
              <Btn size="sm" variant="ghost" icon="external-link" onClick={() => router.push("/panels")}>
                All panels
              </Btn>
            }
          />
          <table className="tbl">
            <thead>
              <tr>
                <th>Panel</th>
                <th>Location</th>
                <th>Rev</th>
                <th>Status</th>
                <th>Issue</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {attention.map((p) => (
                <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/panels/${p.id}`)}>
                  <td>
                    <span className="strong">{p.tag}</span>{" "}
                    <span style={{ color: "var(--c-ink-3)" }}>· {p.name}</span>
                  </td>
                  <td>{p.loc}</td>
                  <td className="mono">
                    {p.rev ?? <span style={{ color: "var(--c-ink-4)" }}>·</span>}
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ color: p.issues ? "var(--c-fault)" : "var(--c-ink-3)" }}>
                    {p.issues ? `${p.issues} open` : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Icon name="chevron-right" size={14} style={{ color: "var(--c-ink-4)" }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: 10, borderTop: "1px solid var(--c-line)", display: "flex", gap: 8 }}>
            <Btn size="sm" icon="plus" variant="primary" onClick={() => router.push("/panels")}>
              Add panel
            </Btn>
            <Btn size="sm" icon="qr-code" onClick={() => router.push("/labels")}>
              Generate labels
            </Btn>
            <Btn size="sm" icon="git-branch" onClick={() => router.push("/revisions")}>
              Review revisions
            </Btn>
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column" }}>
          <CardHead
            title="Activity"
            actions={
              <Btn size="sm" variant="ghost" icon="activity" onClick={() => router.push("/revisions")}>
                Log
              </Btn>
            }
          />
          <div style={{ overflow: "auto" }}>
            <ActivityFeed items={activity} />
          </div>
        </Card>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: "var(--gap)",
          marginTop: "var(--gap)",
        }}
      >
        <Card>
          <CardHead title="Fleet by location" />
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 11 }}>
            {locations.map((l) => {
              const n = panels.filter((p) => p.loc === l.name).length;
              const pct = panels.length ? (n / panels.length) * 100 : 0;
              return (
                <div key={l.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "var(--fz-sm)",
                      marginBottom: 4,
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        color: "var(--c-ink-2)",
                        fontWeight: 540,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {l.name}
                    </span>
                    <span className="mono" style={{ color: "var(--c-ink-3)", flex: "none" }}>
                      {n}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--c-surface-3)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: "var(--c-accent)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHead
            title="Revision queue"
            actions={
              <Btn size="sm" variant="ghost" onClick={() => router.push("/revisions")}>
                Open queue
              </Btn>
            }
          />
          <table className="tbl">
            <thead>
              <tr>
                <th>Panel</th>
                <th>Change</th>
                <th>Rev</th>
                <th>By</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.map((r) => (
                <tr key={r.id} style={{ cursor: "pointer" }} onClick={() => router.push("/revisions")}>
                  <td className="strong mono">{r.tag}</td>
                  <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{r.note}</td>
                  <td className="mono">
                    {r.from}→{r.rev}
                  </td>
                  <td>{r.by.split(" ")[0]}</td>
                  <td>
                    <Badge tone={r.status === "review" ? "warn" : "draft"} dot>
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </Page>
  );
}
