"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSearch, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { IssueStatusBadge, SeverityBadge } from "@/components/domain/badges";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataItem, Page } from "@/components/ui/page";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useIssue, useMe, usePermissions } from "@/data/hooks";
import { ApiError } from "@/lib/api/errors";
import { useFmt } from "@/lib/format";
import { IssueActions } from "./issue-actions";
import { IssueEditDialog } from "./issue-edit-dialog";
import { IssuePhotos } from "./issue-photos";

function BackLink() {
  const t = useTranslations("issues.detail");
  return (
    <Link href="/issues" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-foreground">
      <ArrowLeft className="size-4" aria-hidden />
      {t("back")}
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <Page>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 w-2/3" />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </Page>
  );
}

export function IssueDetailView({ id }: { id: string }) {
  const t = useTranslations("issues.detail");
  const ti = useTranslations("issues");
  const tc = useTranslations("common");
  const fmt = useFmt();
  const { can } = usePermissions();
  const { data: me } = useMe();
  const { data: issue, isLoading, isError, error, refetch } = useIssue(id);
  const [editOpen, setEditOpen] = React.useState(false);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !issue) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 422);
    return (
      <Page>
        <BackLink />
        <Card>
          {notFound ? (
            <EmptyState
              icon={<FileSearch />}
              title={t("notFoundTitle")}
              description={t("notFoundHint")}
              action={
                <Button asChild variant="primary">
                  <Link href="/issues">{t("back")}</Link>
                </Button>
              }
            />
          ) : (
            <ErrorState
              title={t("errorTitle")}
              description={tc("states.errorHint")}
              action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
            />
          )}
        </Card>
      </Page>
    );
  }

  const isManager = can("manage_issues");
  const isReporter = !!me && issue.reported_by === me.id;
  const canEditText = isManager || (isReporter && issue.status === "open");
  const canAddPhoto = can("report_issue") || can("manage_maintenance");
  const finished = issue.status === "resolved" || issue.status === "closed";

  return (
    <Page>
      <BackLink />
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm text-subtle">#{issue.number}</span>
          <SeverityBadge severity={issue.severity} />
          <IssueStatusBadge status={issue.status} />
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-semibold leading-tight [overflow-wrap:anywhere]">{issue.title}</h1>
          {canEditText && (
            <Button variant="ghost" size="icon" aria-label={ti("actions.edit")} onClick={() => setEditOpen(true)}>
              <Pencil />
            </Button>
          )}
        </div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <Link
            href={`/panels/${issue.panel_id}?tab=issues`}
            className="font-medium text-primary hover:underline"
          >
            <span className="font-mono">{issue.panel_tag}</span>
            {issue.panel_name && <span> · {issue.panel_name}</span>}
          </Link>
          <span>
            {issue.reported_by_name
              ? t("reportedLine", { name: issue.reported_by_name, when: fmt.relative(issue.created_at) })
              : t("reportedAnon", { when: fmt.relative(issue.created_at) })}
          </span>
        </p>
      </header>

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-none">
          <Card>
            <CardHeader title={t("description")} />
            <CardBody>
              {issue.description ? (
                <p className="whitespace-pre-wrap text-base [overflow-wrap:anywhere]">{issue.description}</p>
              ) : (
                <p className="text-sm text-muted">{t("noDescription")}</p>
              )}
            </CardBody>
          </Card>

          <IssuePhotos issue={issue} userId={me?.id} isManager={isManager} canAdd={canAddPhoto} />

          {finished && (
            <Card className="border-success/30">
              <CardHeader
                title={
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" aria-hidden />
                    {t("resolution")}
                  </span>
                }
                description={issue.resolved_at ? `${t("resolvedAt")}: ${fmt.dateTime(issue.resolved_at)}` : undefined}
              />
              <CardBody>
                {issue.resolution_note ? (
                  <p className="whitespace-pre-wrap text-base [overflow-wrap:anywhere]">{issue.resolution_note}</p>
                ) : (
                  <p className="text-sm text-muted">{t("noNote")}</p>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        <aside className="order-1 flex flex-col gap-5 lg:order-none">
          <IssueActions issue={issue} />
          <Card>
            <CardHeader title={t("details")} />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
                <DataItem label={t("status")}>
                  <IssueStatusBadge status={issue.status} />
                </DataItem>
                <DataItem label={t("severity")}>
                  <SeverityBadge severity={issue.severity} />
                </DataItem>
                <DataItem label={t("assignee")}>{issue.assigned_to_name}</DataItem>
                <DataItem label={t("reportedBy")}>{issue.reported_by_name}</DataItem>
                <DataItem label={t("createdAt")}>{fmt.dateTime(issue.created_at)}</DataItem>
                {finished && <DataItem label={t("resolvedAt")}>{fmt.dateTime(issue.resolved_at)}</DataItem>}
              </dl>
            </CardBody>
          </Card>
        </aside>
      </div>

      <IssueEditDialog issue={issue} open={editOpen} onOpenChange={setEditOpen} />
    </Page>
  );
}
