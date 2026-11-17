"use client";

import { MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useLocations } from "@/data/hooks";

/** Checkbox list of company locations. An empty selection means "all locations". */
export function LocationChecklist({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("users.locations");
  const tc = useTranslations("common");
  const { data, isLoading, isError, refetch } = useLocations();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (isError)
    return (
      <ErrorState
        className="py-4"
        title={tc("states.errorTitle")}
        action={<Button size="sm" onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
      />
    );
  if (!data || data.length === 0)
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted">
        <MapPin className="size-4 shrink-0" aria-hidden />
        {t("noneDefined")}
      </p>
    );

  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...value, id] : value.filter((v) => v !== id));

  return (
    <div className="flex flex-col gap-2">
      <ul className="scroll-thin max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border">
        {data.map((l) => (
          <li key={l.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-surface-2">
              <Checkbox
                checked={value.includes(l.id)}
                disabled={disabled}
                onCheckedChange={(c) => toggle(l.id, c === true)}
              />
              <span className="min-w-0 flex-1 truncate text-base">{l.name}</span>
              <span className="font-mono text-xs text-subtle">{l.code}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-xs text-subtle">
        {value.length === 0 ? t("allSelected") : t("selected", { count: value.length })}
      </p>
    </div>
  );
}
