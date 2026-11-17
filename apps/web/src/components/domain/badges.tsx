"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, FileX2, Flame } from "lucide-react";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { useFmt } from "@/lib/format";
import type {
  DocStatus,
  IssueState,
  LifecycleStatus,
  Maintenance,
  RevisionStatus,
  Role,
  Severity,
} from "@/data/types";

/** Is there an approved schematic in the field for this panel? */
export function DocStatusBadge({ status }: { status: DocStatus }) {
  const t = useTranslations("common.docStatus");
  const map: Record<DocStatus, { tone: BadgeTone; icon: React.ReactNode }> = {
    approved: { tone: "success", icon: <CheckCircle2 /> },
    in_review: { tone: "info", icon: <Clock /> },
    draft: { tone: "neutral", icon: <CircleDashed /> },
    none: { tone: "warning", icon: <FileX2 /> },
  };
  const { tone, icon } = map[status];
  return (
    <Badge tone={tone}>
      {icon}
      {t(status)}
    </Badge>
  );
}

export function RevisionStatusBadge({ status }: { status: RevisionStatus }) {
  const t = useTranslations("common.revisionStatus");
  const tone: Record<RevisionStatus, BadgeTone> = {
    draft: "neutral",
    review: "info",
    approved: "success",
    rejected: "danger",
    superseded: "outline",
  };
  return (
    <Badge tone={tone[status]} dot>
      {t(status)}
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  const t = useTranslations("common.severity");
  const tone: Record<Severity, BadgeTone> = {
    low: "neutral",
    medium: "warning",
    high: "danger",
    critical: "danger",
  };
  return (
    <Badge tone={tone[severity]} className={severity === "critical" ? "font-semibold" : undefined}>
      {severity === "critical" ? <Flame /> : severity === "high" ? <AlertTriangle /> : null}
      {t(severity)}
    </Badge>
  );
}

export function IssueStatusBadge({ status }: { status: IssueState }) {
  const t = useTranslations("common.issueStatus");
  const tone: Record<IssueState, BadgeTone> = {
    open: "danger",
    in_progress: "info",
    resolved: "success",
    closed: "outline",
  };
  return (
    <Badge tone={tone[status]} dot>
      {t(status)}
    </Badge>
  );
}

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  const t = useTranslations("common.lifecycle");
  const tone: Record<LifecycleStatus, BadgeTone> = {
    draft: "neutral",
    engineering: "info",
    released: "primary",
    installed: "warning",
    commissioned: "success",
    in_service: "success",
    archived: "outline",
  };
  return <Badge tone={tone[status]}>{t(status)}</Badge>;
}

export function RoleBadge({ role }: { role: Role }) {
  const t = useTranslations("common.roles");
  const tone: Record<Role, BadgeTone> = {
    owner: "primary",
    admin: "info",
    engineer: "success",
    technician: "warning",
    viewer: "neutral",
  };
  return <Badge tone={tone[role]}>{t(role)}</Badge>;
}

export function MaintenanceResultBadge({ result }: { result: Maintenance["result"] }) {
  const t = useTranslations("common.maintenanceResult");
  const tone: Record<Maintenance["result"], BadgeTone> = {
    ok: "success",
    attention: "warning",
    fail: "danger",
  };
  return (
    <Badge tone={tone[result]} dot>
      {t(result)}
    </Badge>
  );
}

/** "3 gün gecikti" (red) / "5 gün kaldı" (amber within a week, neutral otherwise). */
export function DueBadge({ dueOn }: { dueOn: string | null | undefined }) {
  const t = useTranslations("common.time");
  const { daysUntil } = useFmt();
  const days = daysUntil(dueOn);
  if (days === null) return null;
  if (days < 0) return <Badge tone="danger">{t("daysOverdue", { count: -days })}</Badge>;
  return <Badge tone={days <= 7 ? "warning" : "neutral"}>{t("dueInDays", { count: days })}</Badge>;
}
