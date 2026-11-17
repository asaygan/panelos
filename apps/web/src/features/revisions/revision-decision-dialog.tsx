"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { useRevisionMutations } from "@/data/hooks";
import type { Revision } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

export type DecisionMode = "approve" | "reject";

export interface RevisionDecisionDialogProps {
  revision: Revision | null;
  mode: DecisionMode;
  onOpenChange: (open: boolean) => void;
}

/** Approve (optional note) or reject (required note) a revision. Open while `revision` is set. */
export function RevisionDecisionDialog({ revision, mode, onOpenChange }: RevisionDecisionDialogProps) {
  const t = useTranslations("revisions.decision");
  const tc = useTranslations("common.actions");
  const errorText = useApiError();
  const { approve, reject } = useRevisionMutations();
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const mutation = mode === "approve" ? approve : reject;

  React.useEffect(() => {
    setNote("");
    setError(null);
  }, [revision?.id, mode]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revision) return;
    const text = note.trim();
    if (mode === "reject" && !text) return setError(t("noteRequired"));
    const letter = revision.revision_letter;
    mutation.mutate(
      { id: revision.id, note: text || null },
      {
        onSuccess: () => {
          toast.success(t(mode === "approve" ? "approved" : "rejected", { letter }));
          onOpenChange(false);
        },
        onError: (err) => toast.error(errorText(err)),
      },
    );
  };

  const letter = revision?.revision_letter ?? "";
  return (
    <Dialog open={revision !== null} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent
        title={t(mode === "approve" ? "approveTitle" : "rejectTitle", { letter })}
        description={t(mode === "approve" ? "approveBody" : "rejectBody")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              {tc("cancel")}
            </Button>
            <Button
              type="submit"
              form="revision-decision-form"
              variant={mode === "approve" ? "primary" : "danger"}
              loading={mutation.isPending}
            >
              {t(mode === "approve" ? "approveAction" : "rejectAction")}
            </Button>
          </>
        }
      >
        <form id="revision-decision-form" onSubmit={submit} className="flex flex-col gap-4">
          {revision && revision.sheet_count === 0 && mode === "approve" && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded border border-warning/30 bg-warning-soft p-3 text-sm text-warning"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {t("zeroSheets")}
            </div>
          )}
          <Field
            label={t(mode === "reject" ? "noteReasonLabel" : "noteLabel")}
            required={mode === "reject"}
            error={error}
          >
            <Textarea
              value={note}
              rows={4}
              placeholder={mode === "approve" ? t("notePlaceholder") : undefined}
              onChange={(e) => {
                setNote(e.target.value);
                setError(null);
              }}
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
