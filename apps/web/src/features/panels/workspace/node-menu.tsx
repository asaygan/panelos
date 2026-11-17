"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, ArrowRightLeft, ExternalLink, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { cn } from "@/lib/utils/cn";
import type { NodeKind } from "./model";

export type NodeAction = "edit" | "addChild" | "move" | "archive" | "delete";

/** What each node kind offers (besides "open panel"). */
export function menuActions(kind: NodeKind | "unassigned", canEdit: boolean): NodeAction[] {
  if (!canEdit) return [];
  switch (kind) {
    case "project":
      return ["edit", "addChild", "archive"];
    case "group":
      return ["edit", "addChild", "delete"];
    case "panel":
      return ["edit", "addChild", "move", "archive"];
    case "cabinet":
      return ["edit", "move", "delete"];
    case "unassigned":
      return ["addChild"];
  }
}

interface Props {
  kind: NodeKind | "unassigned";
  panelId?: string;
  canEdit: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: NodeAction) => void;
  /** Called when the menu closes so the owner can put focus back on the row. */
  onClosed: () => void;
  selected: boolean;
}

const triggerClass =
  "grid size-7 shrink-0 place-items-center rounded text-subtle hover:bg-surface-3 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-4";

/**
 * "More" button for a tree row. The Radix menu is only mounted for the row
 * whose menu is open, so thousands of rows stay cheap.
 */
export function NodeMenu({ kind, panelId, canEdit, open, onOpenChange, onAction, onClosed, selected }: Props) {
  const t = useTranslations("panels.menu");
  const tc = useTranslations("common.actions");
  const actions = menuActions(kind, canEdit);
  const hasOpen = kind === "panel" && !!panelId;
  if (actions.length === 0 && !hasOpen) return <span className="size-7 shrink-0" aria-hidden />;

  const reveal = cn(
    "opacity-0 group-hover/row:opacity-100 [@media(hover:none)]:opacity-100",
    selected && "opacity-100",
  );
  const icon = <MoreHorizontal aria-hidden />;

  if (!open) {
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-label={tc("more")}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(true);
        }}
        className={cn(triggerClass, reveal)}
      >
        {icon}
      </button>
    );
  }

  return (
    <DropdownMenu open onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button type="button" tabIndex={-1} aria-label={tc("more")} onClick={(e) => e.stopPropagation()} className={cn(triggerClass, "opacity-100 bg-surface-3")}>
          {icon}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onClick={(e) => e.stopPropagation()}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          onClosed();
        }}
      >
        {hasOpen && (
          <DropdownMenuItem asChild>
            <Link href={`/panels/${panelId}`}>
              <ExternalLink aria-hidden />
              {t("openPanel")}
            </Link>
          </DropdownMenuItem>
        )}
        {actions.includes("edit") && (
          <DropdownMenuItem onSelect={() => onAction("edit")}>
            <Pencil aria-hidden />
            {tc("edit")}
          </DropdownMenuItem>
        )}
        {actions.includes("addChild") && (
          <DropdownMenuItem onSelect={() => onAction("addChild")}>
            <Plus aria-hidden />
            {t(`add.${kind}`)}
          </DropdownMenuItem>
        )}
        {actions.includes("move") && (
          <DropdownMenuItem onSelect={() => onAction("move")}>
            <ArrowRightLeft aria-hidden />
            {t("move")}
          </DropdownMenuItem>
        )}
        {(actions.includes("archive") || actions.includes("delete")) && <DropdownMenuSeparator />}
        {actions.includes("archive") && (
          <DropdownMenuItem destructive onSelect={() => onAction("archive")}>
            <Archive aria-hidden />
            {tc("archive")}
          </DropdownMenuItem>
        )}
        {actions.includes("delete") && (
          <DropdownMenuItem destructive onSelect={() => onAction("delete")}>
            <Trash2 aria-hidden />
            {tc("delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
