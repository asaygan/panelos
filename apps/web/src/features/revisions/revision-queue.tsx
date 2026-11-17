"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, GitPullRequest, Send, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/controls";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { RevisionStatusBadge } from "@/components/domain/badges";
import { usePermissions, useRevisionQueue } from "@/data/hooks";
import type { Revision } from "@/data/types";
import { useFmt } from "@/lib/format";
import { RevisionDecisionDialog, type DecisionMode } from "./revision-decision-dialog";
import { useSubmitRevision } from "./use-submit-revision";

type Filter = "review" | "draft" | "history";
const FILTERS: Filter[] = ["review", "draft", "history"];

/** Review queue for /revisions: three filters kept in the URL (?filter=). */
export function RevisionQueue() {
  const t = useTranslations("revisions.queue");
  const tl = useTranslations("revisions.timeline");
  const tc = useTranslations("common");
  const fmt = useFmt();
  const { can } = usePermissions();
  const { submit } = useSubmitRevision();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("filter");
  const filter: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : "review";
  const query = useRevisionQueue(filter);
  const [decision, setDecision] = React.useState<{ rev: Revision; mode: DecisionMode } | null>(null);

  const setFilter = (next: string) => router.replace(`${pathname}?filter=${next}`, { scroll: false });
  const rows = query.data ?? [];

  const whenOf = (r: Revision) =>
    filter === "review"
      ? r.submitted_at
      : filter === "draft"
        ? r.updated_at
        : (r.approved_at ?? r.rejected_at ?? r.superseded_at ?? r.updated_at);
  const authorOf = (r: Revision) =>
    filter === "review" ? (r.submitted_by_name ?? r.created_by_name) : r.created_by_name;

  const actions = (r: Revision) => (
    <div className="flex flex-wrap items-center gap-1.5">
      {r.status === "review" && can("approve_revision") && (
        <>
          <Button size="sm" variant="primary" onClick={() => setDecision({ rev: r, mode: "approve" })}>
            <CheckCircle2 />
            {tl("approve")}
          </Button>
          <Button size="sm" variant="danger-ghost" onClick={() => setDecision({ rev: r, mode: "reject" })}>
            <XCircle />
            {tl("reject")}
          </Button>
        </>
      )}
      {r.status === "draft" && can("create_revision") && (
        <Button size="sm" variant="primary" onClick={() => void submit(r)}>
          <Send />
          {tl("submit")}
        </Button>
      )}
      {r.status === "draft" && can("approve_revision") && (
        <Button size="sm" onClick={() => setDecision({ rev: r, mode: "approve" })}>
          <CheckCircle2 />
          {tl("approve")}
        </Button>
      )}
    </div>
  );

  const panelLink = (r: Revision) => (
    <Link href={`/panels/${r.panel_id}?tab=revisions`} className="min-w-0 hover:underline">
      <span className="font-mono text-sm font-medium">{r.panel_tag}</span>
      <span className="text-muted"> · {r.panel_name}</span>
    </Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList aria-label={t("tabsLabel")}>
          {FILTERS.map((f) => (
            <TabsTrigger key={f} value={f}>
              {t(`tabs.${f}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        {query.isLoading ? (
          <SkeletonRows rows={5} />
        ) : query.isError ? (
          <ErrorState
            title={tc("states.errorTitle")}
            description={tc("states.errorHint")}
            action={<Button onClick={() => void query.refetch()}>{tc("actions.retry")}</Button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<GitPullRequest />}
            title={t(`empty.${filter}`)}
            description={t(`emptyHint.${filter}`)}
            action={
              <Button asChild>
                <Link href="/panels">{t("browsePanels")}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <Th>{t("panel")}</Th>
                    <Th>{t("revision")}</Th>
                    <Th>{t("author")}</Th>
                    <Th>{t(`when.${filter}`)}</Th>
                    <Th>{t("contents")}</Th>
                    <Th>{t("summary")}</Th>
                    <Th><span className="sr-only">{tc("fields.actions")}</span></Th>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((r) => (
                    <Tr key={r.id}>
                      <Td className="max-w-64 truncate">{panelLink(r)}</Td>
                      <Td>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{r.revision_letter}</span>
                          <RevisionStatusBadge status={r.status} />
                        </span>
                      </Td>
                      <Td>{authorOf(r) ?? "—"}</Td>
                      <Td className="whitespace-nowrap text-muted">{fmt.relative(whenOf(r))}</Td>
                      <Td className="whitespace-nowrap text-sm text-muted">
                        {tl("sheets", { count: r.sheet_count })} · {tl("components", { count: r.component_count })}
                      </Td>
                      <Td className="max-w-72 truncate text-muted" title={r.change_summary ?? undefined}>
                        {r.change_summary || "—"}
                      </Td>
                      <Td>{actions(r)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    {panelLink(r)}
                    <RevisionStatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-muted">
                    Rev {r.revision_letter} · {authorOf(r) ?? "—"} · {fmt.relative(whenOf(r))}
                  </p>
                  {r.change_summary && <p className="line-clamp-2 text-base">{r.change_summary}</p>}
                  <p className="text-xs text-subtle">
                    {tl("sheets", { count: r.sheet_count })} · {tl("components", { count: r.component_count })}
                  </p>
                  {actions(r)}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <RevisionDecisionDialog
        revision={decision?.rev ?? null}
        mode={decision?.mode ?? "approve"}
        onOpenChange={(o) => !o && setDecision(null)}
      />
    </div>
  );
}
