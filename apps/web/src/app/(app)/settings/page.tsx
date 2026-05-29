"use client";

import { useState } from "react";
import { Page } from "@/components/primitives/page";
import { Card } from "@/components/primitives/card";
import { SettingsNav } from "@/components/settings/settings-nav";
import { OrgForm } from "@/components/settings/org-form";
import { BrandingSection } from "@/components/settings/branding-section";
import { LocationsTable } from "@/components/settings/locations-table";
import { IntegrationsList } from "@/components/settings/integrations-list";
import { SecuritySection } from "@/components/settings/security-section";
import { usePanels } from "@/lib/query/hooks";

export default function SettingsPage() {
  const [tab, setTab] = useState("org");
  const { data: panels = [] } = usePanels();

  return (
    <Page>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "188px 1fr",
          gap: "var(--gap)",
          maxWidth: 980,
        }}
      >
        <SettingsNav active={tab} onChange={setTab} />
        <Card>
          {tab === "org" && <OrgForm />}
          {tab === "branding" && <BrandingSection samplePanel={panels[0]} />}
          {tab === "locations" && <LocationsTable />}
          {tab === "integrations" && <IntegrationsList />}
          {tab === "security" && <SecuritySection />}
        </Card>
      </div>
    </Page>
  );
}
