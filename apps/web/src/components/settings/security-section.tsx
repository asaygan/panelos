"use client";

import { Toggle } from "@/components/primitives/toggle";
import { useCompany, useUpdateCompany } from "@/lib/query/hooks";

export function SecuritySection() {
  const { data: company } = useCompany();
  const updateCompany = useUpdateCompany();

  const publicQr =
    company && "public_qr_access_enabled" in company
      ? (company as { public_qr_access_enabled?: boolean }).public_qr_access_enabled ?? true
      : true;

  return (
    <div>
      <div className="card-head">
        <span className="card-title">Security & access</span>
      </div>
      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          maxWidth: 560,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 0",
            borderBottom: "1px solid var(--c-line)",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "var(--fz)", fontWeight: 600 }}>Public QR access</div>
            <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>
              When on, anyone scanning a panel&rsquo;s QR sees its identity and the latest approved
              schematic. When off, scanners must sign in with your organization — anonymous scans
              return only restricted metadata.
            </div>
          </div>
          <Toggle
            on={publicQr}
            onChange={(next) =>
              updateCompany.mutate({ public_qr_access_enabled: next })
            }
          />
        </div>
      </div>
    </div>
  );
}
