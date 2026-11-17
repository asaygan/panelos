"use client";

import * as React from "react";
import { GitBranch, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Tooltip } from "@/components/ui/menu";
import { usePermissions, useRevisions } from "@/data/hooks";
import type { Panel, Revision } from "@/data/types";
import { RevisionCard } from "./revision-card";
import { RevisionDecisionDialog, type DecisionMode } from "./revision-decision-dialog";
import { RevisionSummaryDialog } from "./revision-summary-dialog";
import { useSubmitRevision } from "./use-submit-revision";

/** Revision timeline + draft / submit / approve actions for one panel. */
export function PanelRevisionsTab({ panel }: { panel: Panel }) {
  const t = useTranslations("revisions.timeline");
  const tc = useTranslations("common");
  const { can } = usePermissions();
  const query = useRevisions(panel.id);
  const { submit } = useSubmitRevision();

  const [creating, setCreating] = React.useState(false);
  const [editing, setEditing] = React.useState<Revision | undefined>();
  const [decision, setDecision] = React.useState<{ rev: Revision; mode: DecisionMode } | null>(null);

  const revisions = React.useMemo(
    () => [...(query.data ?? [])].sort((a, b) => b.revision_number - a.revision_number),
    [query.data],
  );
  const hasDraft = revisions.some((r) => r.status === "draft");
  const liveId = panel.active_revision_id ?? panel.active_revision?.id;

  const newDraft = can("create_revision") && (
    <Tooltip label={hasDraft ? t("draftExists") : t("newDraft")}>
      {/* span keeps the tooltip reachable while the button is disabled */}
      <span tabIndex={hasDraft ? 0 : undefined} aria-label={hasDraft ? t("draftExists") : undefined}>
        <Button variant="primary" disabled={hasDraft} onClick={() => setCreating(true)}>
          <Plus />
          {t("newDraft")}
        </Button>
      </span>
    </Tooltip>
  );

  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold">{t("title")}</h2>
        {newDraft}
      </div>
      {query.isLoading ? (
        <SkeletonRows rows={3} />
      ) : query.isError ? (
        <ErrorState
          title={tc("states.errorTitle")}
          description={tc("states.errorHint")}
          action={<Button onClick={() => void query.refetch()}>{tc("actions.retry")}</Button>}
        />
      ) : revisions.length === 0 ? (
        <EmptyState
          icon={<GitBranch />}
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={newDraft || undefined}
        />
      ) : (
        <ol className="ml-5 mr-4 mt-4 border-l border-border pb-4">
          {revisions.map((r) => (
            <RevisionCard
              key={r.id}
              revision={r}
              panelId={panel.id}
              live={r.id === liveId}
              onEdit={setEditing}
              onSubmit={(rev) => void submit(rev)}
              onDecide={(rev, mode) => setDecision({ rev, mode })}
            />
          ))}
        </ol>
      )}

      <RevisionSummaryDialog panelId={panel.id} open={creating} onOpenChange={setCreating} />
      <RevisionSummaryDialog
        panelId={panel.id}
        revision={editing}
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
      />
      <RevisionDecisionDialog
        revision={decision?.rev ?? null}
        mode={decision?.mode ?? "approve"}
        onOpenChange={(o) => !o && setDecision(null)}
      />
    </Card>
  );
}
