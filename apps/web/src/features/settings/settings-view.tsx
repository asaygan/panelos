"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { Page, PageHeader } from "@/components/ui/page";
import { useCompany, usePermissions } from "@/data/hooks";
import { DataTab } from "./data-tab";
import { LabelsTab } from "./labels-tab";
import { LocationsTab } from "./locations-tab";
import { OrganizationTab } from "./organization-tab";
import { PoliciesTab } from "./policies-tab";

const TABS = ["organization", "policies", "locations", "labels", "data"] as const;
type Tab = (typeof TABS)[number];

export function SettingsView() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const confirm = useConfirm();
  const { can, ready } = usePermissions();
  const { data: company, isLoading, isError, refetch } = useCompany();
  const dirty = React.useRef(false);
  const onDirtyChange = React.useCallback((d: boolean) => {
    dirty.current = d;
  }, []);

  const raw = params.get("tab");
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : "organization";
  const readOnly = !can("manage_org");

  const go = async (next: string) => {
    if (dirty.current) {
      const ok = await confirm({
        title: tc("states.unsavedTitle"),
        description: tc("states.unsavedBody"),
        confirmLabel: tc("states.unsavedDiscard"),
        cancelLabel: tc("states.unsavedKeep"),
        destructive: true,
      });
      if (!ok) return;
      dirty.current = false;
    }
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  };

  const needsCompany = tab === "organization" || tab === "policies";

  return (
    <Page width="full" className="max-w-5xl">
      <PageHeader title={t("title")} description={t("description")} />
      {ready && readOnly && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-muted"
        >
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("readOnly")}
        </div>
      )}
      <Tabs value={tab} onValueChange={(v) => void go(v)}>
        <TabsList aria-label={t("title")}>
          {TABS.map((k) => (
            <TabsTrigger key={k} value={k}>
              {t(`tabs.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="pt-5">
          {needsCompany && isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : needsCompany && (isError || !company) ? (
            <ErrorState
              title={tc("states.errorTitle")}
              description={tc("states.errorHint")}
              action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
            />
          ) : (
            <>
              <TabsContent value="organization">
                {company && (
                  <OrganizationTab company={company} readOnly={readOnly} onDirtyChange={onDirtyChange} />
                )}
              </TabsContent>
              <TabsContent value="policies">
                {company && <PoliciesTab company={company} readOnly={readOnly} />}
              </TabsContent>
              <TabsContent value="locations">
                <LocationsTab readOnly={readOnly} />
              </TabsContent>
              <TabsContent value="labels">
                <LabelsTab />
              </TabsContent>
              <TabsContent value="data">
                <DataTab />
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </Page>
  );
}
