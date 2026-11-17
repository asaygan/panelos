"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/controls";
import type { AuditLog } from "@/data/types";
import { useFmt } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import { AuditMeta } from "./audit-meta";

const TITLE_KEYS = ["tag", "name", "title", "serial", "target_email", "email", "filename", "number"];

function hrefFor(log: AuditLog): string | null {
  if (log.target_type === "panel") return `/panels/${log.target_id}`;
  if (log.target_type === "issue") return `/issues/${log.target_id}`;
  return null;
}

export function AuditEntry({ log }: { log: AuditLog }) {
  const t = useTranslations("users.audit");
  const tc = useTranslations("common");
  const fmt = useFmt();
  const [open, setOpen] = React.useState(false);
  const panelId = React.useId();

  const actor = log.actor_name || log.actor_email || tc("states.system");
  const sentence = t.has(`actions.${log.action}` as never) ? t(`actions.${log.action}` as never) : log.action;
  const meta = log.meta as Record<string, unknown>;
  const title = TITLE_KEYS.map((k) => meta[k]).find((v) => typeof v === "string" || typeof v === "number");
  const targetType = t.has(`targets.${log.target_type}` as never)
    ? t(`targets.${log.target_type}` as never)
    : log.target_type;
  const target = title !== undefined ? String(title) : log.target_id.slice(0, 8);
  const href = hrefFor(log);

  return (
    <li className="px-4 py-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-3 rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <Avatar name={actor} size="sm" className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-base">
            <span className="font-medium">{actor}</span> {sentence}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <time dateTime={log.created_at}>{fmt.dateTime(log.created_at)}</time>
            <span aria-hidden>·</span>
            <span>
              {targetType}: <span className="font-mono">{target}</span>
            </span>
          </p>
        </div>
        <ChevronDown
          className={cn("mt-1 size-4 shrink-0 text-subtle transition-transform", open && "rotate-180")}
          aria-hidden
        />
        <span className="sr-only">{open ? t("hideDetails") : t("showDetails")}</span>
      </button>
      {open && (
        <div id={panelId} className="ml-9 mt-3 flex flex-col gap-3 rounded-lg bg-surface-2 p-3">
          <AuditMeta meta={log.meta} />
          {href && (
            <Link href={href} className="self-start text-sm font-medium text-primary hover:underline">
              {t("openTarget")}
            </Link>
          )}
        </div>
      )}
    </li>
  );
}
