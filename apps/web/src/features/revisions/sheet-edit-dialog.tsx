"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSheetMutations } from "@/data/hooks";
import type { Sheet } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

/** Rename a sheet (number + title) of a draft revision. Open while `sheet` is set. */
export function SheetEditDialog({
  panelId,
  sheet,
  onClose,
}: {
  panelId: string;
  sheet: Sheet | null;
  onClose: () => void;
}) {
  const t = useTranslations("schematics.edit");
  const tt = useTranslations("schematics.tab");
  const tc = useTranslations("common.actions");
  const errorText = useApiError();
  const { update } = useSheetMutations(panelId);
  const [number, setNumber] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    setNumber(sheet?.sheet_number ?? "");
    setTitle(sheet?.sheet_title ?? "");
    setTouched(false);
  }, [sheet]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!sheet || !number.trim() || !title.trim()) return;
    update.mutate(
      { id: sheet.id, body: { sheet_number: number.trim(), sheet_title: title.trim() } },
      {
        onSuccess: () => {
          toast.success(tt("updated"));
          onClose();
        },
        onError: (err) => toast.error(errorText(err)),
      },
    );
  };

  return (
    <Dialog open={sheet !== null} onOpenChange={(o) => !o && !update.isPending && onClose()}>
      <DialogContent
        size="sm"
        title={t("title")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={update.isPending}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="sheet-edit-form" variant="primary" loading={update.isPending}>
              {tc("save")}
            </Button>
          </>
        }
      >
        <form id="sheet-edit-form" onSubmit={submit} className="flex flex-col gap-3">
          <Field label={t("number")} required error={touched && !number.trim() ? t("required") : null}>
            <Input value={number} maxLength={40} onChange={(e) => setNumber(e.target.value)} />
          </Field>
          <Field label={t("sheetTitle")} required error={touched && !title.trim() ? t("required") : null}>
            <Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
