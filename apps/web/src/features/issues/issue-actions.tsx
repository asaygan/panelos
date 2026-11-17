"use client";

import * as React from "react";
import { CheckCircle2, Lock, PlayCircle, RotateCcw, Wrench } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Select } from "@/components/ui/controls";
import { Label } from "@/components/ui/field";
import { toast } from "@/components/ui/toaster";
import { useIssueMutations, useMembers, useMe, usePermissions } from "@/data/hooks";
import type { IssueDetail, IssueUpdate, Severity } from "@/data/types";
import { LogMaintenanceDialog } from "@/features/maintenance/log-maintenance-dialog";
import { useApiError } from "@/lib/use-api-error";
import { isActive, SEVERITIES } from "./issue-utils";
import { ResolveDialog } from "./resolve-dialog";

const NONE = "none";

/** Assignee, severity and the status buttons the signed-in user may use. */
export function IssueActions({ issue }: { issue: IssueDetail }) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const { data: me } = useMe();
  const { update } = useIssueMutations();
  const isManager = can("manage_issues");
  const { data: members } = useMembers(isManager ? { status: "active" } : undefined);
  const [resolveOpen, setResolveOpen] = React.useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = React.useState(false);

  const isAssignee = !!me && issue.assigned_to === me.id;
  const worker = isManager || isAssignee;
  const active = isActive(issue);

  const patch = (body: IssueUpdate, successKey: string, after?: () => void) =>
    update.mutate(
      { id: issue.id, body },
      {
        onSuccess: () => {
          toast.success(t(`toast.${successKey}` as never));
          after?.();
        },
        onError: (e) => toast.error(errorText(e)),
      },
    );

  const askAndPatch = async (kind: "close" | "reopen") => {
    const ok = await confirm({
      title: t(`confirm.${kind}Title`),
      description: t(`confirm.${kind}Body`),
      confirmLabel: t(`actions.${kind}`),
      cancelLabel: tc("actions.cancel"),
    });
    if (ok) patch({ status: kind === "close" ? "closed" : "open" }, kind === "close" ? "closed" : "reopened");
  };

  const assigneeOptions = React.useMemo(() => {
    const list = (members ?? []).map((m) => ({ value: m.user_id, label: m.name }));
    if (issue.assigned_to && !list.some((o) => o.value === issue.assigned_to)) {
      list.push({ value: issue.assigned_to, label: issue.assigned_to_name ?? tc("states.unknown") });
    }
    return [{ value: NONE, label: t("unassigned") }, ...list];
  }, [members, issue.assigned_to, issue.assigned_to_name, t, tc]);

  const showStart = worker && issue.status === "open";
  const showResolve = worker && active;
  const showMaintenance = active && can("manage_maintenance");
  const showClose = isManager && (active || issue.status === "resolved");
  const showReopen = isManager && !active;
  const hasButtons = showStart || showResolve || showMaintenance || showClose || showReopen;

  return (
    <Card>
      <CardHeader title={t("detail.actions")} />
      <CardBody className="flex flex-col gap-4">
        {isManager && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>{t("detail.assignee")}</Label>
              <Select
                aria-label={t("detail.assignee")}
                value={issue.assigned_to ?? NONE}
                disabled={update.isPending}
                placeholder={t("detail.assigneePlaceholder")}
                options={assigneeOptions}
                onValueChange={(v) =>
                  patch({ assigned_to: v === NONE ? null : v }, v === NONE ? "unassigned" : "assigned")
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("detail.severity")}</Label>
              <Select
                aria-label={t("detail.severity")}
                value={issue.severity}
                disabled={update.isPending}
                options={[...SEVERITIES].reverse().map((s) => ({ value: s, label: tc(`severity.${s}`) }))}
                onValueChange={(v) => patch({ severity: v as Severity }, "severity")}
              />
            </div>
          </>
        )}

        {hasButtons ? (
          <div className="flex flex-col gap-2">
            {showStart && (
              <Button size="lg" variant="primary" disabled={update.isPending} onClick={() => patch({ status: "in_progress" }, "started")}>
                <PlayCircle />
                {t("actions.start")}
              </Button>
            )}
            {showMaintenance && (
              <Button size="lg" variant={showStart ? "secondary" : "primary"} onClick={() => setMaintenanceOpen(true)}>
                <Wrench />
                {t("actions.resolveWithMaintenance")}
              </Button>
            )}
            {showResolve && (
              <Button size="lg" onClick={() => setResolveOpen(true)}>
                <CheckCircle2 />
                {t("actions.resolve")}
              </Button>
            )}
            {showClose && (
              <Button size="lg" variant="ghost" disabled={update.isPending} onClick={() => void askAndPatch("close")}>
                <Lock />
                {t("actions.close")}
              </Button>
            )}
            {showReopen && (
              <Button size="lg" disabled={update.isPending} onClick={() => void askAndPatch("reopen")}>
                <RotateCcw />
                {t("actions.reopen")}
              </Button>
            )}
          </div>
        ) : (
          !isManager && <p className="text-sm text-muted">{t("detail.noActions")}</p>
        )}
      </CardBody>

      <ResolveDialog
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        loading={update.isPending}
        onSubmit={(note) =>
          patch({ status: "resolved", resolution_note: note }, "resolved", () => setResolveOpen(false))
        }
      />
      <LogMaintenanceDialog
        open={maintenanceOpen}
        onOpenChange={setMaintenanceOpen}
        panelId={issue.panel_id}
        issueId={issue.id}
      />
    </Card>
  );
}
