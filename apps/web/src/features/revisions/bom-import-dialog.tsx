"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/feedback";
import { FileDropzone } from "@/components/domain/uploads";
import { useBomMutations } from "@/data/hooks";
import { useApiError } from "@/lib/use-api-error";

/** Import BOM rows from a CSV file into a draft revision. */
export function BomImportDialog({
  revisionId,
  open,
  onOpenChange,
}: {
  revisionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("revisions.bom");
  const tc = useTranslations("common.actions");
  const errorText = useApiError();
  const { importCsv } = useBomMutations(revisionId);

  return (
    <Dialog open={open} onOpenChange={(o) => !importCsv.isPending && onOpenChange(o)}>
      <DialogContent
        title={t("importTitle")}
        description={t("importDescription")}
        closeLabel={tc("close")}
      >
        <div className="flex flex-col gap-3">
          <FileDropzone
            accept={["text/csv", ".csv"]}
            maxMb={5}
            disabled={importCsv.isPending}
            hint={t("importHint")}
            onFile={(file) =>
              importCsv.mutate(file, {
                onSuccess: (rows) => {
                  toast.success(t("imported", { count: rows.length }));
                  onOpenChange(false);
                },
                onError: (e) => toast.error(errorText(e)),
              })
            }
          />
          <p className="rounded bg-surface-2 px-3 py-2 font-mono text-xs text-muted">{t("importFormat")}</p>
          {importCsv.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted" role="status">
              <Spinner />
              {tc("upload")}…
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
