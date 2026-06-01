"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { CommandPalette } from "@/components/shell/command-palette";
import { TweaksPanel } from "@/components/shell/tweaks-panel";
import { useCmdK } from "@/hooks/use-cmd-k";
import { ToastProvider } from "@/components/primitives/toast";
import type { User } from "@/lib/api/types";

export function AppShell({
  user,
  company,
  companies = [],
  activeCompanyId = "",
  counts,
  children,
}: {
  user: Pick<User, "name" | "initials" | "color">;
  company: string;
  companies?: { id: string; role: string }[];
  activeCompanyId?: string;
  counts: { panels: number; rev: number };
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useCmdK(() => setCmdOpen((o) => !o));

  return (
    <ToastProvider>
      <div style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
        <Sidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          counts={counts}
          company={company}
          companies={companies}
          activeCompanyId={activeCompanyId}
        />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopBar user={user} onOpenSearch={() => setCmdOpen(true)} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
            {children}
          </div>
        </div>
        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
        <TweaksPanel />
      </div>
    </ToastProvider>
  );
}
