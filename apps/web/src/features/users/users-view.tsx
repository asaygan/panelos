"use client";

import { Lock } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { EmptyState, Skeleton } from "@/components/ui/feedback";
import { Page, PageHeader } from "@/components/ui/page";
import { usePermissions } from "@/data/hooks";
import { AuditTab } from "./audit-tab";
import { MembersTab } from "./members-tab";
import { RolesTab } from "./roles-tab";

type Tab = "members" | "roles" | "audit";

export function UsersView() {
  const t = useTranslations("users");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { can, ready } = usePermissions();

  const tabs: Tab[] = [
    ...(can("manage_users") ? (["members", "roles"] as const) : []),
    ...(can("view_audit") ? (["audit"] as const) : []),
  ];
  const raw = params.get("tab") as Tab | null;
  const tab = raw && tabs.includes(raw) ? raw : tabs[0];

  return (
    <Page width="full" className="max-w-6xl">
      <PageHeader title={t("title")} description={t("description")} />
      {!ready ? (
        <Skeleton className="h-64 w-full" />
      ) : !tab ? (
        <EmptyState icon={<Lock />} title={t("forbidden.title")} description={t("forbidden.description")} />
      ) : (
        <Tabs value={tab} onValueChange={(v) => router.replace(`${pathname}?tab=${v}`, { scroll: false })}>
          <TabsList aria-label={t("title")}>
            {tabs.map((k) => (
              <TabsTrigger key={k} value={k}>
                {t(`tabs.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="pt-5">
            <TabsContent value="members">
              <MembersTab />
            </TabsContent>
            <TabsContent value="roles">
              <RolesTab />
            </TabsContent>
            <TabsContent value="audit">
              <AuditTab />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </Page>
  );
}
