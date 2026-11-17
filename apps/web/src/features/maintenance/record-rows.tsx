"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { MaintenanceResultBadge } from "@/components/domain/badges";
import { AttachmentGallery } from "@/components/domain/attachment-gallery";
import { Skeleton } from "@/components/ui/feedback";
import { useAttachments } from "@/data/hooks";
import type { Maintenance } from "@/data/types";
import { useFmt } from "@/lib/format";

function RecordDetails({ record }: { record: Maintenance }) {
  const t = useTranslations("maintenance.panelTab");
  const { data, isLoading } = useAttachments(record.panel_id, { maintenance_id: record.id });
  return (
    <div className="flex flex-col gap-3 border-t border-border bg-surface-2/40 px-4 py-3">
      <div>
        <h4 className="text-xs font-medium uppercase tracking-wide text-subtle">{t("findings")}</h4>
        <p className="mt-1 whitespace-pre-wrap text-base [overflow-wrap:anywhere]">
          {record.findings || <span className="text-sm text-muted">{t("noFindings")}</span>}
        </p>
      </div>
      {record.attachment_count > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-subtle">{t("photos")}</h4>
          {isLoading ? <Skeleton className="h-20 w-full" /> : <AttachmentGallery attachments={data ?? []} />}
        </div>
      )}
      {record.issue_id && (
        <Link
          href={`/issues/${record.issue_id}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          {t("relatedIssue")}
        </Link>
      )}
    </div>
  );
}

/** Maintenance history rows; each expands to findings, photos and the related issue. */
export function RecordRow({ record, showPanel }: { record: Maintenance; showPanel?: boolean }) {
  const t = useTranslations("maintenance");
  const tc = useTranslations("common");
  const fmt = useFmt();
  const [open, setOpen] = React.useState(false);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? t("panelTab.collapse") : t("panelTab.expand")}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2/60"
      >
        <Chevron className="mt-1 size-4 shrink-0 text-subtle" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm text-muted">{fmt.dateTime(record.performed_at)}</span>
            <span className="text-sm font-medium">{tc(`maintenanceKind.${record.kind}`)}</span>
            <MaintenanceResultBadge result={record.result} />
          </div>
          <p className="mt-1 text-base [overflow-wrap:anywhere]">{record.summary}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-subtle">
            {showPanel && (record.panel_tag || record.panel_name) && (
              <span>
                <span className="font-mono">{record.panel_tag}</span>
                {record.panel_name && ` · ${record.panel_name}`}
              </span>
            )}
            <span>
              {record.performed_by_name
                ? t("performedBy", { name: record.performed_by_name })
                : t("unknownPerformer")}
            </span>
            {record.attachment_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <Camera className="size-3" aria-hidden />
                {t("photoCount", { count: record.attachment_count })}
              </span>
            )}
          </p>
        </div>
      </button>
      {open && <RecordDetails record={record} />}
    </li>
  );
}
