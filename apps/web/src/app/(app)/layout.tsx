import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "./_shell";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  // Never render the app chrome for an unknown user.
  if (!session) redirect("/login");
  const user = session.user;
  const company = session.company.name;
  const companies = session.companies;
  const activeCompanyId = session.company.id;
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
