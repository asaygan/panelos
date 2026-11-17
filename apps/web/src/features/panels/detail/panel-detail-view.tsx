"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Page } from "@/components/ui/page";
import { usePanel } from "@/data/hooks";
import { ApiError } from "@/lib/api/errors";
import type { Panel } from "@/data/types";
import { PanelActionBar, PanelHeader } from "./panel-header";
import { PanelDialogs, type PanelDialogKind } from "./panel-actions";
import { OverviewTab } from "./overview-tab";
import { PANEL_TABS, parseTab, type PanelTab } from "./tabs";

function TabSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

// next/dynamic requires its options as an inline object literal at each call.
const SchematicsTab = dynamic(
  () => import("@/features/revisions/panel-schematics-tab").then((m) => m.PanelSchematicsTab), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const RevisionsTab = dynamic(
  () => import("@/features/revisions/panel-revisions-tab").then((m) => m.PanelRevisionsTab), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const BomTab = dynamic(
  () => import("@/features/revisions/panel-bom-tab").then((m) => m.PanelBomTab), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const IssuesTab = dynamic(
  () => import("@/features/issues/panel-issues-tab").then((m) => m.PanelIssuesTab), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const MaintenanceTab = dynamic(
  () => import("@/features/maintenance/panel-maintenance-tab").then((m) => m.PanelMaintenanceTab), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const CabinetsTab = dynamic(() => import("./cabinets-tab").then((m) => m.CabinetsTab), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const FilesTab = dynamic(() => import("./files-tab").then((m) => m.FilesTab), {
  ssr: false,
  loading: () => <TabSkeleton />,
});
const ActivityTab = dynamic(() => import("./activity-tab").then((m) => m.ActivityTab), {
  ssr: false,
  loading: () => <TabSkeleton />,
});

function LoadingShell() {
  return (
    <Page>
      <div className="flex flex-col gap-3" role="status" aria-busy>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-10 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </Page>
  );
}

export function PanelDetailView({ id }: { id: string }) {
  const t = useTranslations("panelDetail");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { data: panel, isLoading, error, refetch, isFetching } = usePanel(id);
  const [dialog, setDialog] = React.useState<PanelDialogKind | null>(null);
  const tab = parseTab(search.get("tab"));

  const setTab = React.useCallback(
    (next: PanelTab) => {
      const params = new URLSearchParams(search.toString());
      if (next === "overview") params.delete("tab");
      else params.set("tab", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, search],
  );

  if (isLoading) return <LoadingShell />;

  if (error || !panel) {
    const missing = error instanceof ApiError && (error.status === 404 || error.status === 403);
    return (
      <Page>
        {missing ? (
          <EmptyState
            icon={<SearchX />}
            title={t("state.notFoundTitle")}
            description={t("state.notFoundBody")}
            action={
              <Button asChild variant="primary">
                <Link href="/panels">{t("state.backToPanels")}</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState
            title={t("state.loadError")}
            description={tc("states.errorHint")}
            action={
              <Button loading={isFetching} onClick={() => void refetch()}>
                {tc("actions.retry")}
              </Button>
            }
          />
        )}
      </Page>
    );
  }

  return (
    <>
      <Page>
        <PanelHeader panel={panel} onTab={setTab} onAction={setDialog} />
        <Tabs value={tab} onValueChange={(v) => setTab(parseTab(v))}>
          <TabsList aria-label={t("tabs.label")}>
            {PANEL_TABS.map((key) => (
              <TabsTrigger key={key} value={key} count={tabCount(panel, key)}>
                {t(`tabs.${key}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={tab} className="mt-4 outline-none">
            <TabBody tab={tab} panel={panel} onTab={setTab} />
          </TabsContent>
        </Tabs>
      </Page>
      <PanelActionBar onAction={setDialog} />
      <PanelDialogs panel={panel} active={dialog} onClose={() => setDialog(null)} />
    </>
  );
}

function tabCount(panel: Panel, key: PanelTab): number | undefined {
  if (key === "issues") return panel.open_issue_count;
  if (key === "cabinets") return panel.cabinet_count;
  return undefined;
}

function TabBody({
  tab,
  panel,
  onTab,
}: {
  tab: PanelTab;
  panel: Panel;
  onTab: (tab: PanelTab) => void;
}) {
  switch (tab) {
    case "overview":
      return <OverviewTab panel={panel} onTab={onTab} />;
    case "schematics":
      return <SchematicsTab panel={panel} />;
    case "revisions":
      return <RevisionsTab panel={panel} />;
    case "bom":
      return <BomTab panel={panel} />;
    case "cabinets":
      return <CabinetsTab panel={panel} />;
    case "maintenance":
      return <MaintenanceTab panel={panel} />;
    case "issues":
      return <IssuesTab panel={panel} />;
    case "files":
      return <FilesTab panel={panel} />;
    case "activity":
      return <ActivityTab panel={panel} />;
  }
}
