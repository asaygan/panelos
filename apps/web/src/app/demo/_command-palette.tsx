"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { NAV, NAV_ADMIN } from "@/components/shell/sidebar";
import { demoPanels } from "@/lib/demo/data";

const BASE = "/demo";

export interface DemoCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Demo-only command palette. Filters demo panels client-side — no network. */
export function DemoCommandPalette({ open, onOpenChange }: DemoCommandPaletteProps) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const navItems = useMemo(() => [...NAV, ...NAV_ADMIN], []);
  const navHits = navItems.filter(
    (n) => !q || n.label.toLowerCase().includes(q.toLowerCase()),
  );
  const panelHits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return demoPanels
      .filter((p) => (p.tag + p.name + p.serial + p.mfr).toLowerCase().includes(needle))
      .slice(0, 6);
  }, [q]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href as never);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" style={{ alignItems: "flex-start", paddingTop: "12vh" }} />
        <Dialog.Content
          className="modal"
          style={{
            width: 560,
            position: "fixed",
            top: "12vh",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 300,
          }}
        >
          <Dialog.Title style={{ position: "absolute", left: -9999 }}>Search</Dialog.Title>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "12px 14px",
              borderBottom: "1px solid var(--c-line)",
            }}
          >
            <Icon name="search" size={16} style={{ color: "var(--c-ink-3)" }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search demo panels, serials, or jump to…"
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 14,
                color: "var(--c-ink)",
                fontFamily: "var(--font)",
              }}
            />
            <kbd>esc</kbd>
          </div>
          <div style={{ maxHeight: 380, overflow: "auto", padding: 6 }}>
            {panelHits.length > 0 && (
              <div className="label-cap" style={{ padding: "6px 8px" }}>
                Panels
              </div>
            )}
            {panelHits.map((p) => (
              <button
                key={p.id}
                onClick={() => go(`${BASE}/panels/${p.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 8px",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <Icon name="server" size={15} style={{ color: "var(--c-ink-3)" }} />
                <div style={{ flex: 1 }}>
                  <span className="strong mono">{p.tag}</span>{" "}
                  <span style={{ color: "var(--c-ink-3)" }}>{p.name}</span>
                </div>
              </button>
            ))}
            <div className="label-cap" style={{ padding: "6px 8px" }}>
              Go to
            </div>
            {navHits.map((n) => (
              <button
                key={n.id}
                onClick={() => go(`${BASE}${n.href}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 8px",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  textAlign: "left",
                }}
              >
                <Icon name={n.icon} size={15} style={{ color: "var(--c-ink-3)" }} />
                <span style={{ flex: 1 }}>{n.label}</span>
                <Icon name="chevron-right" size={13} style={{ color: "var(--c-ink-4)" }} />
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
