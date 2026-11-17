"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/feedback";
import { usePanels } from "@/data/hooks";
import type { Panel } from "@/data/types";
import { cn } from "@/lib/utils/cn";

export interface PanelPickerProps {
  value: string | null | undefined;
  onChange: (panelId: string, panel: Panel) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** Searchable panel selector (tag · name, project path underneath). */
export function PanelPicker({ value, onChange, disabled, className, ...aria }: PanelPickerProps) {
  const t = useTranslations("common.panelPicker");
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();
  const { data: panels, isLoading } = usePanels();
  const selected = panels?.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          disabled={disabled}
          {...aria}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded border border-border-strong bg-surface px-3 text-left text-base shadow-sm hover:border-subtle disabled:opacity-60 aria-[invalid=true]:border-danger",
            className,
          )}
        >
          <span className={cn("truncate", !selected && "text-subtle")}>
            {selected ? (
              <>
                <span className="font-mono text-sm">{selected.tag}</span>
                <span className="text-muted"> · {selected.name}</span>
              </>
            ) : (
              t("placeholder")
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-subtle" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-0">
        <Command
          filter={(itemValue, search) =>
            itemValue.toLocaleLowerCase("tr").includes(search.toLocaleLowerCase("tr")) ? 1 : 0
          }
        >
          <Command.Input
            placeholder={t("search")}
            className="h-10 w-full border-b border-border bg-transparent px-3 text-base outline-none placeholder:text-subtle"
          />
          <Command.List id={listId} className="scroll-thin max-h-72 overflow-y-auto p-1">
            {isLoading && (
              <div className="grid place-items-center py-6">
                <Spinner />
              </div>
            )}
            <Command.Empty className="py-6 text-center text-sm text-muted">{t("empty")}</Command.Empty>
            {panels?.map((p) => (
              <Command.Item
                key={p.id}
                value={`${p.tag} ${p.name} ${p.serial} ${p.project_name ?? ""}`}
                onSelect={() => {
                  onChange(p.id, p);
                  setOpen(false);
                }}
                className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 data-[selected=true]:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-base">
                    <span className="font-mono text-sm">{p.tag}</span>
                    <span className="text-muted"> · {p.name}</span>
                  </div>
                  {(p.project_name || p.location_name) && (
                    <div className="truncate text-xs text-subtle">
                      {[p.project_name, p.group_name, p.location_name].filter(Boolean).join(" › ")}
                    </div>
                  )}
                </div>
                {p.id === value && <Check className="size-4 shrink-0 text-primary" />}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
