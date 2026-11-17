"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/controls";
import { RevisionStatusBadge } from "@/components/domain/badges";
import { usePermissions, useRevisions } from "@/data/hooks";
import type { Panel, Revision } from "@/data/types";

/**
 * Which revisions the current user may look at for a panel, and which one is
 * selected. Defaults to the live (approved) revision, else the newest.
 * Without create_revision only the live approved revision is offered:
 * unapproved drawings never reach technicians and viewers.
 */
export function useRevisionChoice(panel: Panel) {
  const { can } = usePermissions();
  const query = useRevisions(panel.id);
  const [picked, setPicked] = React.useState<string | undefined>();
  const liveId = panel.active_revision_id ?? panel.active_revision?.id ?? null;

  const all = React.useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.revision_number - a.revision_number),
    [query.data],
  );
  const visible = React.useMemo(
    () => (can("create_revision") ? all : all.filter((r) => r.id === liveId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- can() is derived from the cached session
    [all, liveId, can("create_revision")],
  );
  const selected: Revision | undefined =
    visible.find((r) => r.id === picked) ?? visible.find((r) => r.id === liveId) ?? visible[0];

  return { query, all, visible, selected, liveId, select: setPicked };
}

export function RevisionSelect({
  revisions,
  value,
  onChange,
  liveId,
  className,
}: {
  revisions: Revision[];
  value: string | undefined;
  onChange: (id: string) => void;
  liveId: string | null;
  className?: string;
}) {
  const t = useTranslations("schematics.tab");
  return (
    <Select
      aria-label={t("revision")}
      className={className}
      value={value}
      onValueChange={onChange}
      options={revisions.map((r) => ({
        value: r.id,
        label: (
          <span className="flex items-center gap-2">
            <span className="font-medium">{t("revisionOption", { letter: r.revision_letter })}</span>
            <RevisionStatusBadge status={r.status} />
            {r.id === liveId && <span className="text-xs text-success">{t("live")}</span>}
          </span>
        ),
      }))}
    />
  );
}
