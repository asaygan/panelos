"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import type { Panel } from "@/data/types";
import { cn } from "@/lib/utils/cn";

const MAX_ROWS = 300;
const norm = (s: string) => s.toLocaleLowerCase("tr");

function haystack(p: Panel): string {
  return norm(
    [p.tag, p.name, p.serial, p.project_name, p.group_name, p.location_name].filter(Boolean).join(" "),
  );
}

/** Searchable multi-select of panels. Row body previews a panel, the checkbox toggles it. */
export function PanelSelectList({
  panels,
  selected,
  focusedId,
  onToggle,
  onFocus,
  onSelectMany,
  onClear,
}: {
  panels: Panel[];
  selected: string[];
  focusedId: string | null;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
  onSelectMany: (ids: string[]) => void;
  onClear: () => void;
}) {
  const t = useTranslations("labels");
  const [search, setSearch] = React.useState("");
  const deferred = React.useDeferredValue(search);
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  const filtered = React.useMemo(() => {
    const q = norm(deferred.trim());
    return q ? panels.filter((p) => haystack(p).includes(q)) : panels;
  }, [panels, deferred]);
  const visible = filtered.slice(0, MAX_ROWS);
  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selectedSet.has(p.id));

  return (
    <Card className="flex min-h-0 flex-col">
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("panels.search")}
            aria-label={t("panels.search")}
            className="pl-8"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted" aria-live="polite">
            {t("panels.selectedCount", { selected: selected.length, total: panels.length })}
          </p>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={filtered.length === 0 || allFilteredSelected}
              onClick={() => onSelectMany(filtered.map((p) => p.id))}
            >
              {t("panels.selectAll", { count: filtered.length })}
            </Button>
            <Button variant="ghost" size="sm" disabled={selected.length === 0} onClick={onClear}>
              {t("panels.clear")}
            </Button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={t("panels.noMatch")}
          description={t("panels.noMatchHint")}
          action={
            <Button variant="secondary" size="sm" onClick={() => setSearch("")}>
              {t("panels.clearSearch")}
            </Button>
          }
          className="py-8"
        />
      ) : (
        <ul className="scroll-thin max-h-[22rem] min-h-0 flex-1 divide-y divide-border overflow-y-auto lg:max-h-none">
          {visible.map((p) => {
            const isSel = selectedSet.has(p.id);
            return (
              <li
                key={p.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2",
                  focusedId === p.id && "bg-primary-soft",
                )}
              >
                <Checkbox
                  checked={isSel}
                  onCheckedChange={() => onToggle(p.id)}
                  aria-label={t("panels.selectOne", { tag: p.tag })}
                />
                <button
                  type="button"
                  onClick={() => onFocus(p.id)}
                  aria-current={focusedId === p.id || undefined}
                  className="min-w-0 flex-1 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <div className="truncate text-base">
                    <span className="font-mono text-sm font-medium">{p.tag}</span>
                    <span className="text-muted"> · {p.name}</span>
                  </div>
                  {(p.project_name || p.location_name) && (
                    <div className="truncate text-xs text-subtle">
                      {[p.project_name, p.group_name, p.location_name].filter(Boolean).join(" › ")}
                    </div>
                  )}
                </button>
              </li>
            );
          })}
          {filtered.length > visible.length && (
            <li className="px-3 py-2 text-center text-xs text-subtle">
              {t("panels.truncated", { shown: visible.length, total: filtered.length })}
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
