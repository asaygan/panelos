"use client";

import * as React from "react";
import { Download, History, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { exchangeApi, type AuditQuery } from "@/data/api";
import { useAuditVerify, useMembers, usePermissions } from "@/data/hooks";
import { useFmt } from "@/lib/format";
import { AuditEntry } from "./audit-entry";
import { useAuditPages } from "./use-audit-pages";

const CATEGORIES = [
  "panel",
  "project",
  "system_group",
  "cabinet",
  "revision",
  "file",
  "label",
  "user",
  "auth",
  "company",
  "issue",
  "maintenance",
  "attachment",
  "panels",
  "data",
] as const;

function VerifyBox() {
  const t = useTranslations("users.audit.verify");
  const fmt = useFmt();
  const [enabled, setEnabled] = React.useState(false);
  const q = useAuditVerify(enabled);

  const run = () => (enabled ? void q.refetch() : setEnabled(true));
  const checking = enabled && q.isFetching;

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={run} loading={checking}>
        <ShieldCheck />
        {t("button")}
      </Button>
      {enabled && !checking && q.isError && (
        <p role="alert" className="text-sm text-danger">
          {t("failed")}
        </p>
      )}
      {enabled && !checking && q.data && (
        <p
          role="status"
          className={
            q.data.valid
              ? "flex items-start gap-2 rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-sm text-success"
              : "flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger"
          }
        >
          {q.data.valid ? <ShieldCheck className="mt-0.5 size-4 shrink-0" /> : <ShieldAlert className="mt-0.5 size-4 shrink-0" />}
          <span>
            {q.data.valid ? t("intact") : t("broken")}
            {q.dataUpdatedAt > 0 && <span className="block text-xs opacity-80">{t("checkedAt", { when: fmt.dateTime(q.dataUpdatedAt) })}</span>}
          </span>
        </p>
      )}
    </div>
  );
}

export function AuditTab() {
  const t = useTranslations("users.audit");
  const tc = useTranslations("common");
  const { can } = usePermissions();
  const { data: members } = useMembers(undefined);
  const [category, setCategory] = React.useState("");
  const [actor, setActor] = React.useState("");
  const [since, setSince] = React.useState("");
  const [until, setUntil] = React.useState("");

  const filters = React.useMemo<Omit<AuditQuery, "before" | "limit">>(
    () => ({
      action: category ? `${category}.` : undefined,
      actor_id: actor || undefined,
      since: since ? new Date(`${since}T00:00:00`).toISOString() : undefined,
      until: until ? new Date(`${until}T23:59:59.999`).toISOString() : undefined,
    }),
    [category, actor, since, until],
  );
  const q = useAuditPages(filters, can("view_audit"));
  const rows = q.data?.pages.flat() ?? [];
  const filtered = Boolean(category || actor || since || until);
  const reset = () => {
    setCategory("");
    setActor("");
    setSince("");
    setUntil("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("filters.category")}>
          <NativeSelect value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t("filters.allCategories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.${c}`)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("filters.actor")}>
          <NativeSelect value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="">{t("filters.allActors")}</option>
            {(members ?? []).map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.name || m.email}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("filters.since")}>
          <Input type="date" value={since} max={until || undefined} onChange={(e) => setSince(e.target.value)} />
        </Field>
        <Field label={t("filters.until")}>
          <Input type="date" value={until} min={since || undefined} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <VerifyBox />
        <div className="flex flex-wrap gap-2">
          {filtered && <Button variant="ghost" onClick={reset}>{tc("actions.clear")}</Button>}
          <Button asChild>
            <a href={exchangeApi.exportUrl("audit-logs", "csv")} download>
              <Download />
              {t("export")}
            </a>
          </Button>
        </div>
      </div>

      <Card>
        {q.isLoading ? (
          <SkeletonRows rows={6} />
        ) : q.isError ? (
          <ErrorState
            title={tc("states.errorTitle")}
            description={tc("states.errorHint")}
            action={<Button onClick={() => void q.refetch()}>{tc("actions.retry")}</Button>}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<History />}
            title={filtered ? tc("states.noResults") : t("empty.title")}
            description={filtered ? tc("states.noResultsHint") : t("empty.description")}
            action={filtered ? <Button onClick={reset}>{tc("actions.clear")}</Button> : undefined}
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {rows.map((log) => (
                <AuditEntry key={log.id} log={log} />
              ))}
            </ul>
            {q.hasNextPage && (
              <div className="border-t border-border p-3 text-center">
                <Button loading={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
                  {tc("actions.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
