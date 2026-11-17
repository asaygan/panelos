import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { getSession } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await getSession();
  // Never render the app chrome for an unknown user.
  if (!me) redirect("/login");

  return (
    <AppShell
      user={{ name: me.name, email: me.email, role: me.role ?? null }}
      companies={me.companies}
      activeCompanyId={me.active_company_id ?? null}
    >
      {children}
    </AppShell>
  );
}
