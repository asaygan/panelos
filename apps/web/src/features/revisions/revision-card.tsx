"use client";

import Link from "next/link";
import { CheckCircle2, FileText, ListChecks, Pencil, Send, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RevisionStatusBadge } from "@/components/domain/badges";
import { usePermissions } from "@/data/hooks";
import type { Revision } from "@/data/types";
import { useFmt } from "@/lib/format";
import { cn } from "@/lib/utils/cn";
import type { DecisionMode } from "./revision-decision-dialog";

const dotClass: Record<Revision["status"], string> = {
  draft: "border-border-strong",
  review: "border-info",
  approved: "border-success",
  rejected: "border-danger",
  superseded: "border-border",
};

export interface RevisionCardProps {
  revision: Revision;
  panelId: string;
  live: boolean;
  onEdit: (rev: Revision) => void;
  onSubmit: (rev: Revision) => void;
  onDecide: (rev: Revision, mode: DecisionMode) => void;
}

/** One entry of the revision timeline. */
export function RevisionCard({ revision: r, panelId, live, onEdit, onSubmit, onDecide }: RevisionCardProps) {
  const t = useTranslations("revisions.timeline");
  const fmt = useFmt();
  const { can } = usePermissions();

  const events: { key: string; text: string; at: string | null | undefined }[] = [
    { key: "c", text: t("createdBy", { name: r.created_by_name ?? "—" }), at: r.created_at },
  ];
  if (r.submitted_at)
    events.push({ key: "s", text: t("submittedBy", { name: r.submitted_by_name ?? "—" }), at: r.submitted_at });
  if (r.approved_at)
    events.push({ key: "a", text: t("approvedBy", { name: r.approved_by_name ?? "—" }), at: r.approved_at });
  if (r.rejected_at)
    events.push({ key: "r", text: t("rejectedBy", { name: r.rejected_by_name ?? "—" }), at: r.rejected_at });
  if (r.superseded_at) events.push({ key: "x", text: t("supersededAt"), at: r.superseded_at });

  const tabLink = (tab: string) => `/panels/${panelId}?tab=${tab}`;

  return (
    <li className="relative pb-6 pl-7 last:pb-0">
      <span
        aria-hidden
        className={cn("absolute -left-[7px] top-1.5 size-3.5 rounded-full border-2 bg-surface", dotClass[r.status])}
      />
      <div className={cn("rounded-lg border bg-surface p-4 shadow-sm", live ? "border-success/40" : "border-border")}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">Rev {r.revision_letter}</h3>
          <RevisionStatusBadge status={r.status} />
          {live && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
              <CheckCircle2 className="size-4" aria-hidden />
              {t("live")}
            </span>
          )}
          <span className="ml-auto flex gap-3 text-sm text-muted">
            <span>{t("sheets", { count: r.sheet_count })}</span>
            <span>{t("components", { count: r.component_count })}</span>
          </span>
        </div>

        <p className={cn("mt-2 text-base", !r.change_summary && "text-subtle")}>
          {r.change_summary || t("noSummary")}
        </p>

        {r.review_note && (
          <blockquote className="mt-2 rounded border-l-2 border-border-strong bg-surface-2 px-3 py-2 text-sm">
            <span className="font-medium">{t("reviewNote")}:</span> {r.review_note}
          </blockquote>
        )}

        <ul className="mt-3 flex flex-col gap-0.5 text-sm text-muted">
          {events.map((e) => (
            <li key={e.key}>
              {e.text} · <time dateTime={e.at ?? undefined}>{fmt.dateTime(e.at)}</time>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap gap-2">
          {r.status === "draft" && can("create_revision") && (
            <>
              <Button size="sm" onClick={() => onEdit(r)}>
                <Pencil />
                {t("editSummary")}
              </Button>
              <Button size="sm" variant="primary" onClick={() => onSubmit(r)}>
                <Send />
                {t("submit")}
              </Button>
            </>
          )}
          {(r.status === "draft" || r.status === "review") && can("approve_revision") && (
            <>
              <Button size="sm" variant={r.status === "review" ? "primary" : "secondary"} onClick={() => onDecide(r, "approve")}>
                <CheckCircle2 />
                {t("approve")}
              </Button>
              {r.status === "review" && (
                <Button size="sm" variant="danger-ghost" onClick={() => onDecide(r, "reject")}>
                  <XCircle />
                  {t("reject")}
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="ghost" asChild>
            <Link href={tabLink("schematics")}>
              <FileText />
              {t("viewSheets")}
            </Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href={tabLink("bom")}>
              <ListChecks />
              {t("viewBom")}
            </Link>
          </Button>
        </div>
      </div>
    </li>
  );
}
