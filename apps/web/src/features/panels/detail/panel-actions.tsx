"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";
import { usePanelMutations } from "@/data/hooks";
import type { Panel } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { ReportIssueDialog } from "@/features/issues/report-issue-dialog";
import { LogMaintenanceDialog } from "@/features/maintenance/log-maintenance-dialog";

const LabelDialog = dynamic(() => import("@/features/labels/label-dialog").then((m) => m.LabelDialog), {
  ssr: false,
});
const PanelFormDialog = dynamic(
  () => import("@/features/panels/panel-form-dialog").then((m) => m.PanelFormDialog),
  { ssr: false },
);

export type PanelDialogKind = "issue" | "maintenance" | "label" | "edit";

/** Archive flow shared by the header menu: confirm → archive → back to the list. */
export function useArchivePanel(panel: Panel) {
  const t = useTranslations("panelDetail.archive");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const router = useRouter();
  const errorText = useApiError();
  const { archive } = usePanelMutations();

  return async () => {
    const ok = await confirm({
      title: t("title"),
      description: t("body", { tag: panel.tag }),
      confirmLabel: t("confirm"),
      cancelLabel: tc("actions.cancel"),
      destructive: true,
    });
    if (!ok) return;
    archive.mutate(panel.id, {
      onSuccess: () => {
        toast.success(t("done", { tag: panel.tag }));
        router.replace("/panels");
      },
      onError: (e) => toast.error(errorText(e)),
    });
  };
}

/** The four dialogs a panel page can open, mounted once and driven by `active`. */
export function PanelDialogs({
  panel,
  active,
  onClose,
}: {
  panel: Panel;
  active: PanelDialogKind | null;
  onClose: () => void;
}) {
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  return (
    <>
      {active === "issue" && <ReportIssueDialog open onOpenChange={onOpenChange} panelId={panel.id} />}
      {active === "maintenance" && (
        <LogMaintenanceDialog open onOpenChange={onOpenChange} panelId={panel.id} />
      )}
      {active === "label" && <LabelDialog open onOpenChange={onOpenChange} panel={panel} />}
      {active === "edit" && <PanelFormDialog open onOpenChange={onOpenChange} panel={panel} />}
    </>
  );
}
