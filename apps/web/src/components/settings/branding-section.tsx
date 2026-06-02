"use client";

import Link from "next/link";
import { Btn } from "@/components/primitives/button";
import { EngravedTag } from "@/components/labels/engraved-tag";
import type { Panel } from "@/lib/api/types";

const PLACEHOLDER: Panel = {
  id: "_sample",
  company_id: "",
  location_id: "",
  tag: "MCC-3",
  serial: "MCC-L3-0088",
  qr_token: "",
  name: "MCC Line 3",
  loc: "Plant 1",
  area: "Process Hall",
  volt: "480V",
  amp: "800A",
  phase: "3Ø 3W",
  mfr: "Siemens",
  enclosure: "NEMA 12",
  rev: "E",
  revCount: 1,
  status: "in_service",
  comps: 0,
  install: "—",
  updated: "—",
  by: "—",
  issues: 0,
  scanned: "—",
};

export function BrandingSection({ samplePanel }: { samplePanel?: Panel }) {
  const panel = samplePanel ?? PLACEHOLDER;
  return (
    <div>
      <div className="card-head">
        <span className="card-title">Label branding</span>
      </div>
      <div style={{ padding: 16, display: "flex", gap: 20, alignItems: "center" }}>
        <div
          style={{
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "var(--c-surface-3)",
            borderRadius: "var(--r-md)",
          }}
        >
          <div style={{ transform: "scale(.8)" }}>
            <EngravedTag panel={panel} fields={{ name: true, serial: true, rev: true }} />
          </div>
        </div>
        <div style={{ flex: 1, fontSize: "var(--fz-sm)", color: "var(--c-ink-2)", lineHeight: 1.6 }}>
          Your logo and short name are embedded on every generated tag. Defaults follow your standards
          profile; per-plant overrides are available under Locations.
          <div style={{ marginTop: 12 }}>
            <Link href="/settings/label-templates">
              <Btn size="sm" icon="qr-code">
                Edit label template
              </Btn>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
