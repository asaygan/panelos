"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { IssueStatusBadge, SeverityBadge } from "@/components/domain/badges";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import type { Issue } from "@/data/types";
import { useFmt } from "@/lib/format";
import { cn } from "@/lib/utils/cn";

function PanelRef({ issue }: { issue: Issue }) {
  if (!issue.panel_tag && !issue.panel_name) return null;
  return (
    <span className="min-w-0 truncate">
      <span className="font-mono text-xs">{issue.panel_tag}</span>
      {issue.panel_name && <span className="text-muted"> · {issue.panel_name}</span>}
    </span>
  );
}

function IssueCard({ issue, showPanel }: { issue: Issue; showPanel: boolean }) {
  const t = useTranslations("issues");
  const fmt = useFmt();
  return (
    <Link
      href={`/issues/${issue.id}`}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-sm active:bg-surface-2"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-xs text-subtle">#{issue.number}</span>
        <SeverityBadge severity={issue.severity} />
        <IssueStatusBadge status={issue.status} />
      </div>
      <p className="text-base font-medium leading-snug">{issue.title}</p>
      {showPanel && (
        <div className="flex text-sm">
          <PanelRef issue={issue} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
        <span className="inline-flex items-center gap-1">
          <User className="size-3" aria-hidden />
          {issue.assigned_to_name ?? t("unassigned")}
        </span>
        <span>{fmt.relative(issue.created_at)}</span>
        {issue.attachment_count > 0 && (
          <span className="inline-flex items-center gap-1">
            <Camera className="size-3" aria-hidden />
            {issue.attachment_count}
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * Issues as a table on desktop and cards on phones. Shared by the /issues page
 * and the panel's Arızalar tab (`showPanel={false}` there).
 */
export function IssueList({
  issues,
  showPanel = true,
  className,
}: {
  issues: Issue[];
  showPanel?: boolean;
  className?: string;
}) {
  const t = useTranslations("issues");
  const fmt = useFmt();
  const router = useRouter();

  return (
    <div className={className}>
      <ul className="flex flex-col gap-2 p-3 md:hidden">
        {issues.map((i) => (
          <li key={i.id}>
            <IssueCard issue={i} showPanel={showPanel} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <THead>
            <tr>
              <Th className="w-16">{t("columns.number")}</Th>
              <Th>{t("columns.issue")}</Th>
              {showPanel && <Th>{t("columns.panel")}</Th>}
              <Th>{t("columns.severity")}</Th>
              <Th>{t("columns.status")}</Th>
              <Th>{t("columns.assignee")}</Th>
              <Th>{t("columns.reported")}</Th>
              <Th className="text-right">{t("columns.photos")}</Th>
            </tr>
          </THead>
          <TBody>
            {issues.map((i) => (
              <Tr key={i.id} interactive onClick={() => router.push(`/issues/${i.id}`)}>
                <Td className="font-mono text-sm text-muted">#{i.number}</Td>
                <Td className="max-w-[28rem]">
                  <Link
                    href={`/issues/${i.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="line-clamp-2 font-medium hover:text-primary hover:underline"
                  >
                    {i.title}
                  </Link>
                </Td>
                {showPanel && (
                  <Td className="max-w-[16rem] truncate text-sm">
                    <PanelRef issue={i} />
                  </Td>
                )}
                <Td>
                  <SeverityBadge severity={i.severity} />
                </Td>
                <Td>
                  <IssueStatusBadge status={i.status} />
                </Td>
                <Td className={cn("whitespace-nowrap text-sm", !i.assigned_to_name && "text-subtle")}>
                  {i.assigned_to_name ?? t("unassigned")}
                </Td>
                <Td className="whitespace-nowrap text-sm text-muted">{fmt.relative(i.created_at)}</Td>
                <Td className="text-right text-sm text-muted">
                  {i.attachment_count > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <Camera className="size-3.5" aria-hidden />
                      {i.attachment_count}
                      <span className="sr-only">{t("photoCount", { count: i.attachment_count })}</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
