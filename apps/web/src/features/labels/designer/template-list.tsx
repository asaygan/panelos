"use client";

import { Copy, MoreHorizontal, Plus, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import type { LabelTemplate } from "@/data/types";
import { cn } from "@/lib/utils/cn";

export interface TemplateListProps {
  templates: LabelTemplate[];
  activeId: string | null;
  /** The open template is new and unsaved. */
  hasUnsaved: boolean;
  unsavedName: string;
  canEdit: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function TemplateList(p: TemplateListProps) {
  const t = useTranslations("labels");
  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">{t("designer.templates")}</h2>
        {p.canEdit && (
          <Button size="sm" variant="secondary" onClick={p.onNew}>
            <Plus />
            {t("designer.newTemplate")}
          </Button>
        )}
      </div>
      <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {p.hasUnsaved && (
          <li className="flex items-center gap-2 border-b border-border bg-primary-soft px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.unsavedName || t("designer.untitled")}</span>
            <Badge tone="warning">{t("designer.unsavedBadge")}</Badge>
          </li>
        )}
        {p.templates.length === 0 && !p.hasUnsaved ? (
          <EmptyState title={t("designer.noTemplates")} description={t("designer.noTemplatesHint")} className="py-8" />
        ) : (
          p.templates.map((tpl) => (
            <li
              key={tpl.id}
              className={cn(
                "flex items-center gap-1 border-b border-border pr-1",
                p.activeId === tpl.id && "bg-primary-soft",
              )}
            >
              <button
                type="button"
                onClick={() => p.onSelect(tpl.id)}
                aria-current={p.activeId === tpl.id || undefined}
                className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{tpl.name}</span>
                  {tpl.is_default && <Badge tone="primary">{t("options.defaultMark")}</Badge>}
                </span>
                <span className="font-mono text-2xs text-subtle">{tpl.size_mm} mm</span>
              </button>
              {p.canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={t("designer.actionsFor", { name: tpl.name })}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => p.onDuplicate(tpl.id)}>
                      <Copy />
                      {t("inspector.duplicate")}
                    </DropdownMenuItem>
                    {!tpl.is_default && (
                      <DropdownMenuItem onSelect={() => p.onSetDefault(tpl.id)}>
                        <Star />
                        {t("designer.setDefault")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem destructive onSelect={() => p.onDelete(tpl.id)}>
                      <Trash2 />
                      {t("inspector.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
