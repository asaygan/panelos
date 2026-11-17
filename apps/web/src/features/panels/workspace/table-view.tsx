"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X, Zap } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DocStatusBadge, DueBadge } from "@/components/domain/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/controls";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import { Table, TBody, THead, Td, Th, Tr } from "@/components/ui/table";
import { useLocations, usePanels } from "@/data/hooks";
import type { DocStatus, Panel } from "@/data/types";
import { useFmt } from "@/lib/format";
import { fold } from "./model";
import { IssueCount, OverdueMark } from "./panel-cells";
import { useMediaQuery } from "./use-media-query";

type SortKey = "tag" | "name" | "path" | "location" | "doc" | "issues" | "maintenance" | "scan";
const ALL = "__all__";
const PAGE = 200;
const DOC_RANK: Record<DocStatus, number> = { none: 0, draft: 1, in_review: 2, approved: 3 };
const DOC_STATUSES: DocStatus[] = ["approved", "in_review", "draft", "none"];

const pathOf = (p: Panel) => [p.project_name, p.group_name].filter(Boolean).join(" › ");

export function TableView({ viewSwitch, canCreate, onCreate }: { viewSwitch: React.ReactNode; canCreate: boolean; onCreate: () => void }) {
  const t = useTranslations("panels.table");
  const tc = useTranslations("common");
  const tdoc = useTranslations("common.docStatus");
  const locale = useLocale();
  const fmt = useFmt();
  const router = useRouter();
  const wide = useMediaQuery("(min-width: 640px)");
  const { data: panels, isLoading, isError, refetch } = usePanels();
  const { data: locations = [] } = useLocations();
  const [search, setSearch] = React.useState("");
  const [location, setLocation] = React.useState(ALL);
  const [doc, setDoc] = React.useState(ALL);
  const [sort, setSort] = React.useState<{ key: SortKey; dir: 1 | -1 }>({ key: "tag", dir: 1 });
  const [limit, setLimit] = React.useState(PAGE);
  const collator = React.useMemo(() => new Intl.Collator(locale, { numeric: true, sensitivity: "base" }), [locale]);

  const rows = React.useMemo(() => {
    const q = fold(search.trim());
    const list = (panels ?? []).filter(
      (p) =>
        (location === ALL || p.location_id === location) &&
        (doc === ALL || p.doc_status === doc) &&
        (!q || fold(`${p.tag} ${p.name} ${p.serial} ${p.project_name ?? ""} ${p.group_name ?? ""} ${p.customer ?? ""}`).includes(q)),
    );
    const val = (p: Panel): string | number => {
      switch (sort.key) {
        case "tag": return p.tag;
        case "name": return p.name;
        case "path": return pathOf(p);
        case "location": return p.location_name ?? "";
        case "doc": return DOC_RANK[p.doc_status];
        case "issues": return p.open_issue_count;
        case "maintenance": return p.next_maintenance_on ?? "9999";
        case "scan": return p.last_scan_at ?? "";
      }
    };
    return [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y));
      return c * sort.dir;
    });
  }, [panels, search, location, doc, sort, collator]);

  React.useEffect(() => setLimit(PAGE), [search, location, doc, sort]);

  const filtered = search.trim() !== "" || location !== ALL || doc !== ALL;
  const clear = () => {
    setSearch("");
    setLocation(ALL);
    setDoc(ALL);
  };
  const shown = rows.slice(0, limit);

  const header = (key: SortKey, label: string) => {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <Th aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
        <button
          type="button"
          onClick={() => setSort({ key, dir: active ? (sort.dir === 1 ? -1 : 1) : 1 })}
          className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-foreground"
        >
          {label}
          <Icon className={active ? "size-3 text-foreground" : "size-3 opacity-50"} aria-hidden />
        </button>
      </Th>
    );
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-border p-2">
      {viewSwitch}
      <div className="relative min-w-40 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} aria-label={t("search")} placeholder={t("search")} className="h-8 pl-8 text-sm" />
      </div>
      <Select
        size="sm"
        aria-label={tc("fields.location")}
        className="w-40"
        value={location}
        onValueChange={setLocation}
        options={[{ value: ALL, label: t("allLocations") }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
      />
      <Select
        size="sm"
        aria-label={t("docStatus")}
        className="w-40"
        value={doc}
        onValueChange={setDoc}
        options={[{ value: ALL, label: t("allDocs") }, ...DOC_STATUSES.map((s) => ({ value: s, label: tdoc(s) }))]}
      />
      {filtered && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X />
          {t("clearFilters")}
        </Button>
      )}
      {panels && <span className="ml-auto text-sm text-muted" aria-live="polite">{t("count", { shown: rows.length, total: panels.length })}</span>}
    </div>
  );

  let body: React.ReactNode;
  if (isLoading) body = <SkeletonRows rows={8} />;
  else if (isError)
    body = (
      <ErrorState
        title={tc("states.errorTitle")}
        description={tc("states.errorHint")}
        action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
      />
    );
  else if ((panels?.length ?? 0) === 0)
    body = (
      <EmptyState
        icon={<Zap />}
        title={t("emptyTitle")}
        description={t("emptyBody")}
        action={canCreate ? <Button variant="primary" onClick={onCreate}>{t("create")}</Button> : undefined}
      />
    );
  else if (rows.length === 0)
    body = (
      <EmptyState title={tc("states.noResults")} description={tc("states.noResultsHint")} action={<Button onClick={clear}>{t("clearFilters")}</Button>} />
    );
  else if (!wide)
    body = (
      <ul className="divide-y divide-border">
        {shown.map((p) => (
          <li key={p.id}>
            <Link href={`/panels/${p.id}`} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-surface-2">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-medium">{p.tag}</span>
                <span className="truncate text-base">{p.name}</span>
              </div>
              {(pathOf(p) || p.location_name) && <div className="truncate text-xs text-subtle">{[pathOf(p), p.location_name].filter(Boolean).join(" · ")}</div>}
              <div className="flex flex-wrap items-center gap-1.5">
                <DocStatusBadge status={p.doc_status} />
                <IssueCount count={p.open_issue_count} severity={p.worst_open_severity} />
                {p.maintenance_overdue ? <OverdueMark /> : <DueBadge dueOn={p.next_maintenance_on} />}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  else
    body = (
      <Table>
        <THead>
          <tr>
            {header("tag", tc("fields.tag"))}
            {header("name", tc("fields.name"))}
            {header("path", t("path"))}
            {header("location", tc("fields.location"))}
            {header("doc", t("docStatus"))}
            {header("issues", t("issues"))}
            {header("maintenance", t("nextMaintenance"))}
            {header("scan", t("lastScan"))}
          </tr>
        </THead>
        <TBody>
          {shown.map((p) => (
            <Tr key={p.id} interactive onClick={() => router.push(`/panels/${p.id}`)}>
              <Td className="whitespace-nowrap font-mono text-sm font-medium">
                <Link href={`/panels/${p.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">
                  {p.tag}
                </Link>
              </Td>
              <Td className="max-w-64 truncate">{p.name}</Td>
              <Td className="max-w-56 truncate text-muted">{pathOf(p) || "—"}</Td>
              <Td className="whitespace-nowrap text-muted">{p.location_name ?? "—"}</Td>
              <Td><DocStatusBadge status={p.doc_status} /></Td>
              <Td><IssueCount count={p.open_issue_count} severity={p.worst_open_severity} showZero /></Td>
              <Td className="whitespace-nowrap">{p.next_maintenance_on ? <DueBadge dueOn={p.next_maintenance_on} /> : <span className="text-subtle">—</span>}</Td>
              <Td className="whitespace-nowrap text-muted">{p.last_scan_at ? fmt.relative(p.last_scan_at) : tc("time.never")}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    );

  return (
    <Card className="min-w-0 overflow-hidden">
      {toolbar}
      {body}
      {rows.length > limit && (
        <div className="flex justify-center border-t border-border p-3">
          <Button onClick={() => setLimit(limit + PAGE)}>{tc("actions.loadMore")}</Button>
        </div>
      )}
    </Card>
  );
}
