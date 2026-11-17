"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";

/** Asks for the resolution note before an issue is marked as resolved. */
export function ResolveDialog({
  open,
  onOpenChange,
  loading,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (note: string) => void;
}) {
  const t = useTranslations("issues.resolveDialog");
  const tc = useTranslations("common");
  const [note, setNote] = React.useState("");
  const [touched, setTouched] = React.useState(false);
  const empty = note.trim().length === 0;

  React.useEffect(() => {
    if (!open) {
      setNote("");
      setTouched(false);
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!empty) onSubmit(note.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title={t("title")}
        description={t("description")}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" form="resolve-issue-form" variant="primary" loading={loading}>
              {t("submit")}
            </Button>
          </>
        }
      >
        <form id="resolve-issue-form" onSubmit={submit} noValidate>
          <Field label={t("note")} required error={touched && empty ? t("noteRequired") : null}>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder={t("notePlaceholder")}
              autoFocus
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
