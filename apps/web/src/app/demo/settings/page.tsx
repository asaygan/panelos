"use client";

import { useState } from "react";
import { Page } from "@/components/primitives/page";
import { Card } from "@/components/primitives/card";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Btn } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { Icon } from "@/components/icons/icon";
import { useToast } from "@/components/primitives/toast";
import { SettingsNav } from "@/components/settings/settings-nav";
import { IntegrationsList } from "@/components/settings/integrations-list";
import { SecuritySection } from "@/components/settings/security-section";
import { demoCompany, demoLocations, demoPanels } from "@/lib/demo/data";

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
        padding: 14,
        borderTop: "1px solid var(--c-line)",
      }}
    >
      <Btn>Cancel</Btn>
      <Btn variant="primary" onClick={onSave}>
        Save changes
      </Btn>
    </div>
  );
}

function OrgForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState(demoCompany.name);
  const [shortName, setShortName] = useState(demoCompany.short_name);
  const initials = (shortName || name || "NF").slice(0, 2).toUpperCase();
  return (
    <div>
      <div className="card-head">
        <span className="card-title">Organization profile</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 10,
              background: "var(--c-ink)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {initials}
          </div>
          <div>
            <Btn size="sm" icon="upload" onClick={onSave}>
              Replace logo
            </Btn>
            <div style={{ fontSize: 11, color: "var(--c-ink-4)", marginTop: 5 }}>
              PNG, SVG or JPG · used on labels &amp; exports
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Legal name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Short name (labels)">
            <Input value={shortName} onChange={(e) => setShortName(e.target.value)} />
          </Field>
          <Field label="Standards profile">
            <Select defaultValue="IEC 61439">
              <option value="IEC 61439">IEC 61439</option>
              <option value="UL 508A">UL 508A</option>
            </Select>
          </Field>
          <Field label="Default voltage class">
            <Select defaultValue="lv">
              <option value="lv">Low voltage (≤1kV)</option>
              <option value="mv">Medium voltage</option>
            </Select>
          </Field>
        </div>
      </div>
      <SaveBar onSave={onSave} />
    </div>
  );
}

function BrandingSection({ onSave }: { onSave: () => void }) {
  const panel = demoPanels[0]!;
  return (
    <div>
      <div className="card-head">
        <span className="card-title">Label branding</span>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14, maxWidth: 520 }}>
        <Field label="Label header text">
          <Input defaultValue={demoCompany.short_name} />
        </Field>
        <Field label="Default template">
          <Select defaultValue="engraved">
            <option value="engraved">Engraved nameplate (90 × 50)</option>
            <option value="print">Thermal print B/W (90 × 50)</option>
          </Select>
        </Field>
        <div
          style={{
            padding: 11,
            border: "1px solid var(--c-line)",
            borderRadius: "var(--r-sm)",
            fontSize: "var(--fz-sm)",
            color: "var(--c-ink-3)",
          }}
        >
          Sample panel for previews: <span className="mono strong">{panel.tag}</span> · {panel.name}
        </div>
      </div>
      <SaveBar onSave={onSave} />
    </div>
  );
}

function LocationsTable({ onSave }: { onSave: () => void }) {
  return (
    <div>
      <div className="card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="card-title">Locations</span>
        <Btn size="sm" icon="plus" onClick={onSave}>
          Add location
        </Btn>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Region</th>
            <th>Panels</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {demoLocations.map((l) => (
            <tr key={l.id}>
              <td className="mono strong">{l.code}</td>
              <td>{l.name}</td>
              <td style={{ color: "var(--c-ink-3)" }}>{l.sub}</td>
              <td className="num">{demoPanels.filter((p) => p.location_id === l.id).length}</td>
              <td>
                <Btn icon="pencil" variant="ghost" size="sm" onClick={onSave} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DemoSettingsPage() {
  const toast = useToast();
  const [tab, setTab] = useState("org");
  const onSave = () => toast.success("Demo mode — changes aren't saved.");

  return (
    <Page>
      <div style={{ display: "grid", gridTemplateColumns: "188px 1fr", gap: "var(--gap)", maxWidth: 980 }}>
        <SettingsNav active={tab} onChange={setTab} />
        <Card>
          {tab === "org" && <OrgForm onSave={onSave} />}
          {tab === "branding" && <BrandingSection onSave={onSave} />}
          {tab === "locations" && <LocationsTable onSave={onSave} />}
          {tab === "integrations" && (
            <div>
              <IntegrationsList />
              <div style={{ padding: "0 12px 12px", display: "flex", justifyContent: "flex-end" }}>
                <Badge tone="idle">
                  <Icon name="shield" size={11} style={{ verticalAlign: "-1px", marginRight: 4 }} />
                  Demo — connections are read-only
                </Badge>
              </div>
            </div>
          )}
          {tab === "security" && <SecuritySection />}
        </Card>
      </div>
    </Page>
  );
}
