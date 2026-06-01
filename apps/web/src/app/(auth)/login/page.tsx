"use client";

import { useActionState } from "react";
import { Btn } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Field } from "@/components/primitives/field";
import { loginAction, type LoginState } from "@/lib/auth/server-actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState | undefined, FormData>(loginAction, undefined);

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "1.05fr .95fr",
        background: "var(--c-surface)",
      }}
    >
      <div
        className="blueprint"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 40,
          color: "#dce7fb",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: "linear-gradient(155deg,#4b8cff,#2563eb)",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,.3)",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" opacity=".85" />
                <path d="M13 3 9 12h4l-2 9" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 17,
                fontWeight: 760,
                letterSpacing: "-.02em",
                color: "#fff",
              }}
            >
              PanelOS
            </span>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 2, maxWidth: 420 }}>
          <div
            style={{
              fontSize: 30,
              fontWeight: 720,
              lineHeight: 1.12,
              letterSpacing: "-.02em",
              color: "#fff",
            }}
          >
            The operating system for industrial electrical panels.
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "#aebfdd", marginTop: 16 }}>
            Give every industrial panel a permanent digital identity — from the design office to the
            shop floor.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 28 }}>
            {[
              "QR-linked panel identity",
              "Revision-controlled schematics",
              "Secure field access",
            ].map((v) => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7fb0ff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span style={{ fontSize: 13, color: "#cdd9f0" }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 2, fontSize: 11, color: "#6f82a8" }}>
          PanelOS — the operating system for industrial electrical panels.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <form action={formAction} style={{ width: 320 }}>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em" }}>Sign in to PanelOS</div>
          <div
            style={{
              fontSize: "var(--fz-sm)",
              color: "var(--c-ink-3)",
              marginTop: 4,
              marginBottom: 22,
            }}
          >
            Access QR-linked panel records, revision-controlled schematics, and secure field
            documentation.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <Field label="Work email">
              <Input name="email" type="email" placeholder="you@company.com" autoFocus required />
            </Field>
            <Field label="Password">
              <Input name="password" type="password" required />
            </Field>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "var(--fz-sm)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--c-ink-2)",
                  cursor: "pointer",
                }}
              >
                <input name="remember" type="checkbox" defaultChecked /> Keep me signed in
              </label>
              <span style={{ color: "var(--c-accent)", cursor: "pointer", fontWeight: 540 }}>Forgot?</span>
            </div>
            {state?.error && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--c-fault)",
                  background: "var(--c-fault-soft)",
                  border: "1px solid var(--c-fault-line)",
                  borderRadius: "var(--r-sm)",
                  padding: "6px 9px",
                }}
              >
                {state.error}
              </div>
            )}
            <Btn
              variant="primary"
              type="submit"
              disabled={pending}
              style={{ height: 34, justifyContent: "center", marginTop: 4 }}
            >
              {pending ? "Signing in…" : "Sign in"}
            </Btn>
          </div>
          <div style={{ fontSize: 11, color: "var(--c-ink-4)", marginTop: 22, textAlign: "center" }}>
            Access is invite-only. Contact your organization administrator for an invitation.
          </div>
        </form>
      </div>
    </div>
  );
}
