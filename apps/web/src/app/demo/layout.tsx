"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { TweaksPanel } from "@/components/shell/tweaks-panel";
import { ToastProvider } from "@/components/primitives/toast";
import { useCmdK } from "@/hooks/use-cmd-k";
import { DemoProvider } from "@/lib/demo/context";
import { demoCompany, demoCounts, demoUser } from "@/lib/demo/data";
import { DemoCommandPalette } from "./_command-palette";

export default function DemoLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useCmdK(() => setCmdOpen((o) => !o));

  return (
    <DemoProvider>
      <ToastProvider>
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              flex: "none",
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              color: "#7a4f00",
              background: "var(--c-warn-soft, #fdf0d5)",
              borderBottom: "1px solid var(--c-line)",
            }}
          >
            You&apos;re viewing a demo — data is not real and nothing you do is saved.
          </div>
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <Sidebar
              collapsed={collapsed}
              onCollapse={setCollapsed}
              counts={demoCounts}
              company={demoCompany.name}
              basePath="/demo"
            />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <TopBar
                title="PanelOS"
                user={demoUser}
                onOpenSearch={() => setCmdOpen(true)}
                basePath="/demo"
                demoMode
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                {children}
              </div>
            </div>
          </div>
          <DemoCommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
          <TweaksPanel />
        </div>
      </ToastProvider>
    </DemoProvider>
  );
}
