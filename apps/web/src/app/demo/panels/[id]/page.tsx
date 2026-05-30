"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { PanelDetailHeader } from "@/components/panels/panel-detail-header";
import { PanelOverview } from "@/components/panels/panel-overview";
import { PanelComponentsTable } from "@/components/panels/panel-components-table";
import { RevisionTimeline } from "@/components/panels/revision-timeline";
import { PanelQRCard } from "@/components/panels/panel-qr-card";
import { ActivityFeed } from "@/components/panels/activity-feed";
import { BlueprintPlaceholder } from "@/components/pdf/blueprint-placeholder";
import { Card, CardHead } from "@/components/primitives/card";
import { Btn } from "@/components/primitives/button";
import { Toolbar } from "@/components/primitives/toolbar";
import { Empty } from "@/components/primitives/empty";
import { useToast } from "@/components/primitives/toast";
import { Icon } from "@/components/icons/icon";
import { demoActivity, demoComponents, demoPanels, demoRevisions, demoSheets } from "@/lib/demo/data";

type TabId = "overview" | "schematics" | "components" | "revisions" | "qr" | "activity";

const TABS: { id: TabId; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { id: "overview", label: "Overview", icon: "layout-grid" },
  { id: "schematics", label: "Schematics", icon: "file-text" },
  { id: "components", label: "Components", icon: "cpu" },
  { id: "revisions", label: "Revisions", icon: "git-branch" },
  { id: "qr", label: "QR & Label", icon: "qr-code" },
  { id: "activity", label: "Activity", icon: "activity" },
];

export default function DemoPanelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const panel = demoPanels.find((p) => p.id === id);
  const components = demoComponents;
  const revisions = demoRevisions;
  const sheets = demoSheets;
  const activity = demoActivity;
  const [tab, setTab] = useState<TabId>("overview");

  if (!panel) notFound();

  const tabs = TABS.map((t) => {
    if (t.id === "revisions") return { ...t, count: revisions.length };
    if (t.id === "components") return { ...t, count: components.length };
    if (t.id === "schematics") return { ...t, count: sheets.length };
    return t;
  });

  const fakeSave = () => toast.success("Demo mode — changes aren't saved.");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px 0", background: "var(--c-surface)", borderBottom: "1px solid var(--c-line)" }}>
        <PanelDetailHeader panel={panel} onLabel={fakeSave} onNewRevision={fakeSave} />
        <div className="tabs" style={{ marginTop: 12 }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`tab${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
              style={{ background: "transparent", border: "none" }}
            >
              <Icon name={t.icon} size={14} />
              {t.label}
              {"count" in t && t.count != null && <span className="count">{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {tab === "overview" && (
          <PanelOverview
            panel={panel}
            sheets={sheets}
            components={components}
            revisions={revisions}
            onOpenSchematics={() => setTab("schematics")}
            onViewComponents={() => setTab("components")}
            onViewRevisions={() => setTab("revisions")}
          />
        )}
        {tab === "schematics" && (
          <Card style={{ overflow: "hidden" }}>
            <CardHead
              title={`Schematic set · Rev ${panel.rev}`}
              actions={
                <Btn size="sm" icon="upload" onClick={() => toast.success("Demo mode — uploads disabled.")}>
                  Upload sheet
                </Btn>
              }
            />
            <div style={{ display: "flex", gap: 20, padding: 16 }}>
              <BlueprintPlaceholder
                sheetNumber={sheets[3]?.n ?? "004"}
                title={sheets[3]?.title ?? "Power"}
                rev={panel.rev}
                panelName={panel.name}
                totalSheets={sheets.length}
                width={520}
              />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="label-cap" style={{ marginBottom: 4 }}>
                  Sheets
                </div>
                {sheets.map((s) => (
                  <div
                    key={s.n}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      padding: "7px 9px",
                      border: "1px solid var(--c-line)",
                      borderRadius: "var(--r-sm)",
                      fontSize: "var(--fz-sm)",
                    }}
                  >
                    <span className="mono" style={{ color: "var(--c-ink-3)" }}>
                      {s.n}
                    </span>
                    <span style={{ flex: 1 }}>{s.title}</span>
                    <Icon name="file-text" size={13} style={{ color: "var(--c-ink-4)" }} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
        {tab === "components" && (
          <Card style={{ overflow: "hidden" }}>
            <CardHead title={`Components · ${components.length}`} />
            <PanelComponentsTable comps={components} />
          </Card>
        )}
        {tab === "revisions" && (
          <div style={{ maxWidth: 760 }}>
            <Toolbar>
              <span className="card-title">Revision history</span>
              <Btn size="sm" variant="primary" icon="plus" style={{ marginLeft: "auto" }} onClick={fakeSave}>
                New revision
              </Btn>
            </Toolbar>
            <RevisionTimeline revs={revisions} onView={() => setTab("schematics")} />
          </div>
        )}
        {tab === "qr" && <PanelQRCard panel={panel} onOpenLabel={fakeSave} />}
        {tab === "activity" && (
          <Card style={{ maxWidth: 620 }}>
            <CardHead title="Panel activity" />
            {activity.length === 0 ? (
              <Empty icon="activity" title="No activity yet" />
            ) : (
              <ActivityFeed items={activity} />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
