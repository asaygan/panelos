"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import { PanelDetailHeader } from "@/components/panels/panel-detail-header";
import { PanelOverview } from "@/components/panels/panel-overview";
import { PanelComponentsSection } from "@/components/panels/panel-components-section";
import { PanelSectionsSection } from "@/components/panels/panel-sections-section";
import { RevisionTimeline } from "@/components/panels/revision-timeline";
import { NewRevisionModal } from "@/components/panels/new-revision-modal";
import { PanelQRCard } from "@/components/panels/panel-qr-card";
import { ActivityFeed } from "@/components/panels/activity-feed";
import { SchematicViewer } from "@/components/pdf/schematic-viewer";
import { LabelModal } from "@/components/labels/label-modal";
import { Card, CardHead } from "@/components/primitives/card";
import { Btn } from "@/components/primitives/button";
import { Toolbar } from "@/components/primitives/toolbar";
import { Empty } from "@/components/primitives/empty";
import { Icon } from "@/components/icons/icon";
import {
  usePanel,
  usePanelComponents,
  usePanelRevisions,
  usePanelSheets,
  usePanelActivity,
} from "@/lib/query/hooks";

type TabId = "overview" | "sections" | "schematics" | "components" | "revisions" | "qr" | "activity";

const TABS: { id: TabId; label: string; icon: Parameters<typeof Icon>[0]["name"]; count?: number }[] = [
  { id: "overview", label: "Overview", icon: "layout-grid" },
  { id: "sections", label: "Sections", icon: "list" },
  { id: "schematics", label: "Schematics", icon: "file-text" },
  { id: "components", label: "Components", icon: "cpu" },
  { id: "revisions", label: "Revisions", icon: "git-branch" },
  { id: "qr", label: "QR & Label", icon: "qr-code" },
  { id: "activity", label: "Activity", icon: "activity" },
];

export default function PanelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: panel, isLoading, isError } = usePanel(id);
  const { data: components = [] } = usePanelComponents(id);
  const { data: revisions = [] } = usePanelRevisions(id);
  const { data: sheets = [] } = usePanelSheets(id);
  const { data: activity = [] } = usePanelActivity(id);
  const [tab, setTab] = useState<TabId>("overview");
  const [labelOpen, setLabelOpen] = useState(false);
  const [newRevOpen, setNewRevOpen] = useState(false);

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
        <Empty icon="server" title="Loading panel…" />
      </div>
    );
  }
  if (isError || !panel) notFound();

  const tabs = TABS.map((t) => {
    if (t.id === "revisions") return { ...t, count: revisions.length };
    if (t.id === "components") return { ...t, count: components.length };
    if (t.id === "schematics") return { ...t, count: sheets.length };
    return t;
  });

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "14px 16px 0",
          background: "var(--c-surface)",
          borderBottom: "1px solid var(--c-line)",
        }}
      >
        <PanelDetailHeader
          panel={panel}
          onLabel={() => setLabelOpen(true)}
          onNewRevision={() => setNewRevOpen(true)}
        />
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
              {t.count != null && <span className="count">{t.count}</span>}
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
          <Card style={{ height: "calc(100vh - 200px)", overflow: "hidden" }}>
            <SchematicViewer panelId={id} panel={panel} embedded />
          </Card>
        )}
        {tab === "sections" && <PanelSectionsSection panelId={id} />}
        {tab === "components" && <PanelComponentsSection panelId={id} />}
        {tab === "revisions" && (
          <div style={{ maxWidth: 760 }}>
            <Toolbar>
              <span className="card-title">Revision history</span>
              <Btn
                size="sm"
                variant="primary"
                icon="plus"
                style={{ marginLeft: "auto" }}
                onClick={() => setNewRevOpen(true)}
              >
                New revision
              </Btn>
            </Toolbar>
            {revisions.length === 0 ? (
              <Empty icon="git-branch" title="No revisions yet" sub="Create the first revision for this panel." />
            ) : (
              <RevisionTimeline revs={revisions} onView={() => setTab("schematics")} />
            )}
          </div>
        )}
        {tab === "qr" && <PanelQRCard panel={panel} onOpenLabel={() => setLabelOpen(true)} />}
        {tab === "activity" && (
          <Card style={{ maxWidth: 620 }}>
            <CardHead title="Panel activity" />
            {activity.length === 0 ? (
              <Empty icon="activity" title="No activity yet" sub="Scans and changes will appear here." />
            ) : (
              <ActivityFeed items={activity} />
            )}
          </Card>
        )}
      </div>

      <LabelModal panel={panel} open={labelOpen} onOpenChange={setLabelOpen} />
      <NewRevisionModal
        panelId={id}
        panelTag={panel.tag}
        open={newRevOpen}
        onOpenChange={setNewRevOpen}
      />
    </div>
  );
}
