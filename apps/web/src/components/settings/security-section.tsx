"use client";

import { Toggle } from "@/components/primitives/toggle";

const SECURITY: [string, string, boolean][] = [
  ["Enforce SSO (SAML)", "All web sign-ins routed through Entra ID", true],
  ["Require MFA for field app", "Hardware or TOTP for technician logins", true],
  ["Revision approval required", "Drafts must be approved before publishing", true],
  ["Allow offline export", "Technicians may cache panels on-device", false],
];

export function SecuritySection() {
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
        {SECURITY.map(([t, d, on]) => (
          <div
            key={t}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 0",
              borderBottom: "1px solid var(--c-line)",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "var(--fz)", fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{d}</div>
            </div>
            <Toggle defaultOn={on} />
          </div>
        ))}
      </div>
    </div>
  );
}
