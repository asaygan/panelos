"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { useRevisionMutations } from "@/data/hooks";
import type { Revision } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

export interface RevisionSummaryDialogProps {
  panelId: string;
  /** Pass a draft to edit its summary; omit to start a new draft. */
  revision?: Revision;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Start a new draft revision (change summary) or edit a draft's summary. */
export function RevisionSummaryDialog({ panelId, revision, open, onOpenChange }: RevisionSummaryDialogProps) {
  const t = useTranslations("revisions.summaryDialog");
  const tc = useTranslations("common.actions");
  const errorText = useApiError();
  const { create, update } = useRevisionMutations();
  const [summary, setSummary] = React.useState("");
  const mutation = revision ? update : create;

  React.useEffect(() => {
    if (open) setSummary(revision?.change_summary ?? "");
  }, [open, revision]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = summary.trim() || null;
    if (revision) {
      update.mutate(
        { id: revision.id, summary: text },
        {
          onSuccess: () => {
            toast.success(t("updated"));
            onOpenChange(false);
          },
          onError: (err) => toast.error(errorText(err)),
        },
      );
    } else {
      create.mutate(
        { panelId, summary: text },
        {
          onSuccess: (rev) => {
            toast.success(t("created", { letter: rev.revision_letter }));
            onOpenChange(false);
          },
          onError: (err) => toast.error(errorText(err)),
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent
        title={revision ? t("editTitle", { letter: revision.revision_letter }) : t("newTitle")}
        description={revision ? undefined : t("newDescription")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="revision-summary-form" variant="primary" loading={mutation.isPending}>
              {revision ? tc("save") : t("create")}
            </Button>
          </>
        }
      >
        <form id="revision-summary-form" onSubmit={submit}>
          <Field label={t("label")}>
            <Textarea
              value={summary}
              rows={4}
              maxLength={2000}
              placeholder={t("placeholder")}
              onChange={(e) => setSummary(e.target.value)}
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
