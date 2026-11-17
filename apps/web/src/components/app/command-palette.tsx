"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Box,
  CornerDownLeft,
  FolderKanban,
  Layers,
  PanelsTopLeft,
  Search,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Kbd, Spinner } from "@/components/ui/feedback";
import { useSearch } from "@/data/hooks";
import type { SearchHit } from "@/data/types";
import { useVisibleNav } from "./sidebar";

const TYPE_ICON: Record<SearchHit["type"], React.ComponentType<{ className?: string }>> = {
  panel: PanelsTopLeft,
  project: FolderKanban,
  system_group: Layers,
  cabinet: Box,
  component: Wrench,
  issue: TriangleAlert,
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** ⌘K / Ctrl+K: jump to a page or search the whole asset hierarchy. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("nav");
  const router = useRouter();
  const nav = useVisibleNav();
  const [query, setQuery] = React.useState("");
  const term = useDebounced(query, 180);
  const { data: hits, isFetching } = useSearch(term);

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href as never);
  };

  const searching = query.trim().length >= 2;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[12dvh] z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">{t("searchPlaceholder")}</DialogPrimitive.Title>
          {/* Server does the matching; cmdk only handles keyboard navigation. */}
          <Command shouldFilter={!searching} loop>
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-subtle" aria-hidden />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={t("searchPlaceholder")}
                className="h-12 flex-1 bg-transparent text-lg outline-none placeholder:text-subtle"
              />
              {isFetching && <Spinner />}
            </div>
            <Command.List className="scroll-thin max-h-[55dvh] overflow-y-auto p-1.5">
              {searching ? (
                <>
                  {!isFetching && (hits?.length ?? 0) === 0 && (
                    <div className="px-3 py-8 text-center text-sm text-muted">
                      {t("searchEmpty", { query: query.trim() })}
                    </div>
                  )}
                  {hits?.map((hit) => {
                    const Icon = TYPE_ICON[hit.type] ?? Search;
                    return (
                      <Command.Item
                        key={`${hit.type}:${hit.id}`}
                        value={`${hit.type}:${hit.id}`}
                        onSelect={() => go(hit.href)}
                        className="flex cursor-default items-center gap-3 rounded px-2.5 py-2 data-[selected=true]:bg-surface-2"
                      >
                        <Icon className="size-4 shrink-0 text-subtle" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-base">{hit.title}</div>
                          {hit.subtitle && (
                            <div className="truncate text-xs text-subtle">{hit.subtitle}</div>
                          )}
                        </div>
                        <span className="shrink-0 text-2xs uppercase tracking-wide text-subtle">
                          {t(`searchTypes.${hit.type}`)}
                        </span>
                      </Command.Item>
                    );
                  })}
                </>
              ) : (
                <Command.Group
                  heading={t("searchGoTo")}
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-subtle"
                >
                  {nav.map((item) => (
                    <Command.Item
                      key={item.key}
                      value={t(item.key)}
                      onSelect={() => go(item.href)}
                      className="flex cursor-default items-center gap-3 rounded px-2.5 py-2 data-[selected=true]:bg-surface-2"
                    >
                      <item.icon className="size-4 text-subtle" />
                      <span className="text-base">{t(item.key)}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
            <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-subtle">
              <span>{t("searchHint")}</span>
              <span className="hidden items-center gap-1 sm:flex">
                <Kbd>
                  <CornerDownLeft className="size-3" />
                </Kbd>
                <Kbd>esc</Kbd>
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
