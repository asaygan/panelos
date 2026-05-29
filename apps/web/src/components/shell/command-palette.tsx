"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons/icon";
import { NAV, NAV_ADMIN } from "./sidebar";
import { useSearch } from "@/lib/query/hooks";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  // Nav items filter locally; panels come from /api/v1/search via TanStack Query.
  const navItems = useMemo(() => [...NAV, ...NAV_ADMIN], []);
  const navHits = navItems.filter((n) => !debounced || n.label.toLowerCase().includes(debounced.toLowerCase()));
  const { data: searchHits = [] } = useSearch(debounced);
  const panelHits = searchHits.filter((h) => h.type === "panel").slice(0, 6);

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
              placeholder="Search panels, serials, or jump to…"
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
                onClick={() => go(`/panels/${p.id}`)}
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
                  <span className="strong mono">{p.label}</span>{" "}
                  {p.sub && <span style={{ color: "var(--c-ink-3)" }}>{p.sub}</span>}
                </div>
              </button>
            ))}
            <div className="label-cap" style={{ padding: "6px 8px" }}>
              Go to
            </div>
            {navHits.map((n) => (
              <button
                key={n.id}
                onClick={() => go(n.href)}
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
