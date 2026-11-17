"use client";

import * as React from "react";
import { History, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { useAuditLog, usePanelScans, usePermissions } from "@/data/hooks";
import type { Panel } from "@/data/types";
import { useFmt } from "@/lib/format";
import { summarizeDevice } from "./device";

const PAGE = 20;

function ScansCard({ panelId }: { panelId: string }) {
  const t = useTranslations("panelDetail.activity");
  const tc = useTranslations("common");
  const fmt = useFmt();
  const { data, isLoading, error, refetch, isFetching } = usePanelScans(panelId);
  const [shown, setShown] = React.useState(PAGE);

  return (
    <Card>
      <CardHeader title={t("scansTitle")} description={t("scansDescription")} />
      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : error ? (
        <ErrorState
          title={t("scansError")}
          description={tc("states.errorHint")}
          action={
            <Button loading={isFetching} onClick={() => void refetch()}>
              {tc("actions.retry")}
            </Button>
          }
        />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<ScanLine />} title={t("scansEmpty")} description={t("scansEmptyHint")} />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {data.slice(0, shown).map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <ScanLine className="size-4 shrink-0 text-subtle" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base">{summarizeDevice(s.device) ?? t("unknownDevice")}</div>
                </div>
                <time dateTime={s.at} className="shrink-0 text-sm text-muted" title={fmt.dateTime(s.at)}>
                  {fmt.dateTime(s.at)}
                </time>
              </li>
            ))}
          </ul>
          {data.length > shown && (
            <div className="border-t border-border p-3 text-center">
              <Button variant="ghost" size="sm" onClick={() => setShown((n) => n + PAGE)}>
                {t("showMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function AuditCard({ panelId }: { panelId: string }) {
  const t = useTranslations("panelDetail.activity");
  const tc = useTranslations("common");
  const fmt = useFmt();
  const [limit, setLimit] = React.useState(PAGE);
  const { data, isLoading, error, refetch, isFetching } = useAuditLog({
    target_type: "panel",
    target_id: panelId,
    limit,
  });

  const label = (action: string) => (t.has(`actions.${action}` as never) ? t(`actions.${action}` as never) : action);

  return (
    <Card>
      <CardHeader title={t("historyTitle")} description={t("historyDescription")} />
      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : error ? (
        <ErrorState
          title={t("historyError")}
          description={tc("states.errorHint")}
          action={
            <Button loading={isFetching} onClick={() => void refetch()}>
              {tc("actions.retry")}
            </Button>
          }
        />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<History />} title={t("historyEmpty")} />
      ) : (
        <>
          <ol className="flex flex-col px-4 py-3">
            {data.map((e, i) => (
              <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                {i < data.length - 1 && (
                  <span className="absolute left-[5px] top-3 h-full w-px bg-border" aria-hidden />
                )}
                <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-surface bg-primary ring-1 ring-border" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium">{label(e.action)}</p>
                  <p className="text-sm text-muted">
                    {e.actor_name ?? e.actor_email ?? tc("states.system")} · {fmt.dateTime(e.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {data.length >= limit && (
            <div className="border-t border-border p-3 text-center">
              <Button variant="ghost" size="sm" loading={isFetching} onClick={() => setLimit((n) => n + PAGE)}>
                {t("showMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function ActivityTab({ panel }: { panel: Panel }) {
  const { can } = usePermissions();
  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <ScansCard panelId={panel.id} />
      {can("view_audit") && <AuditCard panelId={panel.id} />}
    </div>
  );
}
