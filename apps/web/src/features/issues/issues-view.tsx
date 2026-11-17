"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleCheck, Plus, SearchX, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented, Select } from "@/components/ui/controls";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Page, PageHeader } from "@/components/ui/page";
import { useIssues, usePermissions } from "@/data/hooks";
import type { Severity } from "@/data/types";
import { ExportMenu } from "./export-menu";
import { IssueList } from "./issue-list";
import { SEVERITIES, sortIssues } from "./issue-utils";
import { ReportIssueDialog } from "./report-issue-dialog";

type StateFilter = "open" | "closed" | "all";
const STATES: StateFilter[] = ["open", "closed", "all"];
const ANY = "any";

export function IssuesView() {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { can } = usePermissions();
  const [reportOpen, setReportOpen] = React.useState(false);

  const rawState = params.get("state");
  const state: StateFilter = STATES.includes(rawState as StateFilter) ? (rawState as StateFilter) : "open";
  const rawSeverity = params.get("severity");
  const severity = SEVERITIES.includes(rawSeverity as Severity) ? (rawSeverity as Severity) : undefined;
  const mine = params.get("mine") === "1";

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const { data, isLoading, isError, refetch } = useIssues({
    state,
    severity,
    mine: mine || undefined,
    limit: 200,
  });
  const issues = React.useMemo(() => sortIssues(data ?? []), [data]);
  const filtered = severity !== undefined || mine;

  const reportButton = (
    <Button variant="primary" onClick={() => setReportOpen(true)}>
      <Plus />
      {t("report")}
    </Button>
  );

  return (
    <Page>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            {can("export_data") && <ExportMenu dataset="issues" />}
            {can("report_issue") && reportButton}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Segmented<StateFilter>
          aria-label={t("filters.state")}
          value={state}
          onChange={(v) => setParam("state", v === "open" ? null : v)}
          options={STATES.map((s) => ({ value: s, label: t(`filters.${s}`) }))}
        />
        <div className="w-44">
          <Select
            size="sm"
            aria-label={t("filters.severity")}
            value={severity ?? ANY}
            onValueChange={(v) => setParam("severity", v === ANY ? null : v)}
            options={[
              { value: ANY, label: t("filters.allSeverities") },
              ...[...SEVERITIES].reverse().map((s) => ({ value: s, label: tc(`severity.${s}`) })),
            ]}
          />
        </div>
        <Button
          size="sm"
          variant={mine ? "primary" : "secondary"}
          aria-pressed={mine}
          onClick={() => setParam("mine", mine ? null : "1")}
        >
          <UserCheck />
          {t("filters.mine")}
        </Button>
        {!isLoading && data && (
          <span className="ml-auto text-sm text-muted">{t("count", { count: issues.length })}</span>
        )}
      </div>

      <Card>
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : isError ? (
          <ErrorState
            title={t("errorTitle")}
            description={tc("states.errorHint")}
            action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
          />
        ) : issues.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX />}
              title={t("empty.filteredTitle")}
              description={t("empty.filteredHint")}
              action={
                <Button
                  onClick={() => {
                    const next = new URLSearchParams(params.toString());
                    next.delete("severity");
                    next.delete("mine");
                    const qs = next.toString();
                    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                  }}
                >
                  {t("filters.clear")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<CircleCheck />}
              title={state === "closed" ? t("empty.closedTitle") : state === "all" ? t("empty.allTitle") : t("empty.openTitle")}
              description={state === "closed" ? t("empty.closedHint") : t("empty.openHint")}
              action={can("report_issue") ? reportButton : undefined}
            />
          )
        ) : (
          <IssueList issues={issues} />
        )}
      </Card>

      <ReportIssueDialog open={reportOpen} onOpenChange={setReportOpen} />
    </Page>
  );
}
