import type { ReactNode } from "react";
import { AppShell } from "./_shell";
import { getSession } from "@/lib/auth/session";
import type { User } from "@/lib/api/types";

const FALLBACK_USER: User = {
  id: "_anon",
  email: "",
  name: "PanelOS",
  initials: "P",
  status: "active",
};

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  const user = session?.user ?? FALLBACK_USER;
  const company = session?.company.name ?? "PanelOS";
  const companies = session?.companies ?? [];
  const activeCompanyId = session?.company.id ?? "";
  const counts = { panels: 0, rev: 0 };

  return (
    <AppShell
      user={user}
      company={company}
      companies={companies}
      activeCompanyId={activeCompanyId}
      counts={counts}
    >
      {children}
    </AppShell>
  );
}
