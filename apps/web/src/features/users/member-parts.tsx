"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { Member } from "@/data/types";
import { useFmt } from "@/lib/format";

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("users.status");
  const tone = status === "active" ? "success" : status === "invited" ? "info" : "danger";
  return (
    <Badge tone={tone} dot>
      {t.has(status as never) ? t(status as never) : status}
    </Badge>
  );
}

export function LocationChips({ member }: { member: Member }) {
  const t = useTranslations("users.locations");
  const list = member.assigned_locations ?? [];
  if (list.length === 0) return <span className="text-sm text-muted">{t("all")}</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {list.map((l) => (
        <li key={l.id}>
          <Badge tone="outline" title={l.name}>
            {l.name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** Pending invites show when they were sent; everyone else shows last activity. */
export function ActivityText({ member }: { member: Member }) {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const fmt = useFmt();
  if (member.status === "invited") return <>{t("invitedAt", { when: fmt.relative(member.invited_at) })}</>;
  return <>{member.last_active_at ? fmt.relative(member.last_active_at) : tc("time.never")}</>;
}
