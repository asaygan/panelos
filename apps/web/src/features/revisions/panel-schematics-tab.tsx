"use client";

import * as React from "react";
import { AlertTriangle, FileX2, Pencil, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Tooltip } from "@/components/ui/menu";
import { RevisionStatusBadge } from "@/components/domain/badges";
import { usePermissions, useSheetMutations, useSheets } from "@/data/hooks";
import type { Panel, Sheet } from "@/data/types";
import { SchematicViewer } from "@/features/schematics/schematic-viewer";
import { useApiError } from "@/lib/use-api-error";
import { RevisionSelect, useRevisionChoice } from "./revision-choice";
import { SheetEditDialog } from "./sheet-edit-dialog";
import { UploadSchematicDialog } from "./upload-schematic-dialog";

/** Schematic viewer + revision selector + sheet upload for one panel. */
export function PanelSchematicsTab({ panel }: { panel: Panel }) {
  const t = useTranslations("schematics.tab");
  const tc = useTranslations("common");
  const { can } = usePermissions();
  const confirm = useConfirm();
  const errorText = useApiError();
  const { query, all, visible, selected, liveId, select } = useRevisionChoice(panel);
  const sheetsQuery = useSheets(selected ? panel.id : undefined, selected?.id);
  const { remove } = useSheetMutations(panel.id);

  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Sheet | null>(null);

  const draft = all.find((r) => r.status === "draft");
  const canEditSheets = can("upload_pdf") && selected?.status === "draft";
  const canUpload = can("upload_pdf") && (selected?.status === "draft" || (!draft && can("create_revision")));

  const removeSheet = async (sheet: Sheet) => {
    const ok = await confirm({
      title: t("removeTitle", { number: sheet.sheet_number }),
      description: t("removeBody"),
      confirmLabel: tc("actions.remove"),
      cancelLabel: tc("actions.cancel"),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(sheet.id, {
      onSuccess: () => toast.success(t("removed")),
      onError: (e) => toast.error(errorText(e)),
    });
  };

  const uploadButton = canUpload && (
    <Button variant="primary" onClick={() => setUploadOpen(true)}>
      <Upload />
      {t("upload")}
    </Button>
  );

  if (query.isLoading) return <Skeleton className="h-96 w-full" />;
  if (query.isError)
    return (
      <Card>
        <ErrorState
          title={tc("states.errorTitle")}
          description={tc("states.errorHint")}
          action={<Button onClick={() => void query.refetch()}>{tc("actions.retry")}</Button>}
        />
      </Card>
    );

  const dialogs = (
    <>
      <UploadSchematicDialog
        panelId={panel.id}
        draft={draft}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploaded={select}
      />
      <SheetEditDialog panelId={panel.id} sheet={editing} onClose={() => setEditing(null)} />
    </>
  );

  if (!selected) {
    const none = all.length === 0;
    return (
      <Card>
        <EmptyState
          icon={<FileX2 />}
          title={none && can("create_revision") ? t("noRevisionTitle") : t("noApprovedTitle")}
          description={none && can("create_revision") ? t("noRevisionDescription") : t("noApprovedDescription")}
          action={uploadButton || undefined}
        />
        {dialogs}
      </Card>
    );
  }

  const isLive = selected.id === liveId;
  const bannerKey =
    selected.status === "superseded" ? "superseded" : selected.status === "rejected" ? "rejected" : "notApproved";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {visible.length > 1 ? (
          <RevisionSelect
            className="w-full sm:w-72"
            revisions={visible}
            value={selected.id}
            onChange={select}
            liveId={liveId}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">
              {t("revisionOption", { letter: selected.revision_letter })}
            </span>
            <RevisionStatusBadge status={selected.status} />
            {isLive && <span className="text-sm text-success">{t("live")}</span>}
          </div>
        )}
        {uploadButton && <div className="sm:ml-auto">{uploadButton}</div>}
      </div>

      {!isLive && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-base font-medium text-warning"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t(bannerKey)}
        </div>
      )}

      <Card className="overflow-hidden">
        {sheetsQuery.isLoading ? (
          <Skeleton className="m-3 h-80" />
        ) : sheetsQuery.isError ? (
          <ErrorState
            title={tc("states.errorTitle")}
            description={tc("states.errorHint")}
            action={<Button onClick={() => void sheetsQuery.refetch()}>{tc("actions.retry")}</Button>}
          />
        ) : (
          <SchematicViewer
            sheets={sheetsQuery.data ?? []}
            emptyAction={canEditSheets ? uploadButton || undefined : undefined}
            sheetActions={
              canEditSheets
                ? (sheet) => (
                    <>
                      <Tooltip label={t("editSheet")}>
                        <Button variant="ghost" size="icon-sm" aria-label={t("editSheet")} onClick={() => setEditing(sheet)}>
                          <Pencil />
                        </Button>
                      </Tooltip>
                      <Tooltip label={t("removeSheet")}>
                        <Button
                          variant="danger-ghost"
                          size="icon-sm"
                          aria-label={t("removeSheet")}
                          onClick={() => void removeSheet(sheet)}
                        >
                          <Trash2 />
                        </Button>
                      </Tooltip>
                    </>
                  )
                : undefined
            }
          />
        )}
      </Card>
      {dialogs}
    </div>
  );
}
