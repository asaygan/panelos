"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, CircleCheck, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { usePanelIssues, usePermissions } from "@/data/hooks";
import type { Panel } from "@/data/types";
import { IssueList } from "./issue-list";
import { isActive, sortIssues } from "./issue-utils";
import { ReportIssueDialog } from "./report-issue-dialog";

/** Issues of one panel: open first, finished ones in a collapsed section. */
export function PanelIssuesTab({ panel }: { panel: Panel }) {
  const t = useTranslations("issues.panelTab");
  const ti = useTranslations("issues");
  const tc = useTranslations("common");
  const { can } = usePermissions();
  const { data, isLoading, isError, refetch } = usePanelIssues(panel.id);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [showClosed, setShowClosed] = React.useState(false);

  const sorted = React.useMemo(() => sortIssues(data ?? []), [data]);
  const open = sorted.filter(isActive);
  const closed = sorted.filter((i) => !isActive(i));

  return (
    <>
      <Card>
        <CardHeader
          title={t("open")}
          actions={
            can("report_issue") && (
              <Button variant="primary" size="sm" onClick={() => setReportOpen(true)}>
                <Plus />
                {ti("report")}
              </Button>
            )
          }
        />
        {isLoading ? (
          <SkeletonRows rows={3} />
        ) : isError ? (
          <ErrorState
            title={tc("states.errorTitle")}
            description={tc("states.errorHint")}
            action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<CircleCheck />}
            title={t("emptyTitle")}
            description={t("emptyHint")}
            action={
              can("report_issue") && (
                <Button variant="primary" onClick={() => setReportOpen(true)}>
                  <Plus />
                  {ti("report")}
                </Button>
              )
            }
          />
        ) : open.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">{t("noneOpen")}</p>
        ) : (
          <IssueList issues={open} showPanel={false} />
        )}
      </Card>

      {closed.length > 0 && (
        <Card className="mt-4">
          <button
            type="button"
            aria-expanded={showClosed}
            onClick={() => setShowClosed((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-base font-semibold"
          >
            {showClosed ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            {showClosed ? t("closed") : t("showClosed", { count: closed.length })}
          </button>
          {showClosed && (
            <div className="border-t border-border">
              <IssueList issues={closed} showPanel={false} />
            </div>
          )}
        </Card>
      )}

      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} panelId={panel.id} />
    </>
  );
}
