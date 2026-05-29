"use client";

import type { Component, Panel, Revision, Sheet } from "@/lib/api/types";
import { Card, CardHead } from "@/components/primitives/card";
import { Meta } from "@/components/primitives/meta";
import { Btn } from "@/components/primitives/button";
import { QRGlyph } from "@/components/labels/qr-glyph";
import { PanelComponentsTable } from "./panel-components-table";
import { RevisionTimeline } from "./revision-timeline";

export interface PanelOverviewProps {
  panel: Panel;
  sheets: Sheet[];
  components: Component[];
  revisions: Revision[];
  onOpenSchematics: () => void;
  onViewComponents: () => void;
  onViewRevisions: () => void;
}

export function PanelOverview({
  panel,
  sheets,
  components,
  revisions,
  onOpenSchematics,
  onViewComponents,
  onViewRevisions,
}: PanelOverviewProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "var(--gap)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
        <Card>
          <CardHead title="Asset details" actions={<Btn size="sm" variant="ghost" icon="pencil">Edit</Btn>} />
          <div
            style={{
              padding: 14,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
            }}
          >
            <Meta label="Serial number" value={panel.serial} mono />
            <Meta label="Manufacturer" value={panel.mfr} />
            <Meta label="Enclosure" value={panel.enclosure} />
            <Meta label="Voltage" value={panel.volt} mono />
            <Meta label="Main breaker" value={panel.amp} mono />
            <Meta label="Configuration" value={panel.phase} mono />
            <Meta label="Installed" value={panel.install} mono />
            <Meta label="Components" value={`${panel.comps} devices`} />
          </div>
        </Card>

        <Card>
          <CardHead
            title={`Latest schematics · Rev ${panel.rev}`}
            actions={
              <Btn size="sm" icon="external-link" onClick={onOpenSchematics}>
                Open viewer
              </Btn>
            }
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              padding: 12,
            }}
          >
            {sheets.slice(2, 6).map((s) => (
              <div key={s.n} onClick={onOpenSchematics} style={{ cursor: "pointer" }}>
                <div
                  className="blueprint"
                  style={{
                    aspectRatio: "1.3",
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--c-line-strong)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      position: "absolute",
                      top: 5,
                      left: 6,
                      fontSize: 9,
                      color: "#9db8e8",
                    }}
                  >
                    SHT {s.n}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: "var(--c-ink-3)",
                    marginTop: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.title}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHead
            title="Component highlights"
            actions={
              <Btn size="sm" variant="ghost" onClick={onViewComponents}>
                View all {components.length}
              </Btn>
            }
          />
          <PanelComponentsTable comps={components.slice(0, 5)} />
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
        <Card style={{ padding: 12 }}>
          <div className="label-cap" style={{ marginBottom: 10 }}>
            Asset tag
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div
              style={{
                border: "1px solid var(--c-line-strong)",
                borderRadius: 6,
                padding: 6,
                background: "#fff",
              }}
            >
              <QRGlyph value={panel.serial} size={78} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="mono" style={{ fontSize: 13, fontWeight: 700 }}>
                {panel.serial}
              </div>
              <div style={{ fontSize: 11, color: "var(--c-ink-3)", marginTop: 2 }}>
                Scanned {panel.scanned}
              </div>
              <Btn size="sm" icon="qr-code" style={{ marginTop: 8 }}>
                Generate label
              </Btn>
            </div>
          </div>
        </Card>

        <Card>
          <CardHead title="Recent revisions" />
          <div style={{ padding: 12 }}>
            <RevisionTimeline revs={revisions.slice(0, 3)} onView={onOpenSchematics} />
          </div>
          <div style={{ padding: "0 12px 12px" }}>
            <Btn size="sm" variant="ghost" icon="history" onClick={onViewRevisions}>
              Full history ({panel.revCount})
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
