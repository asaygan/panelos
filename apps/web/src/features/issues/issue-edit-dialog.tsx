"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { useIssueMutations } from "@/data/hooks";
import type { IssueDetail } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

/** Edit title and description (reporter while open, or a manager). */
export function IssueEditDialog({
  issue,
  open,
  onOpenChange,
}: {
  issue: IssueDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("issues");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const { update } = useIssueMutations();
  const [title, setTitle] = React.useState(issue.title);
  const [description, setDescription] = React.useState(issue.description ?? "");
  const titleOk = title.trim().length >= 3 && title.trim().length <= 200;

  React.useEffect(() => {
    if (open) {
      setTitle(issue.title);
      setDescription(issue.description ?? "");
    }
  }, [open, issue.title, issue.description]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleOk) return;
    update.mutate(
      { id: issue.id, body: { title: title.trim(), description: description.trim() || null } },
      {
        onSuccess: () => {
          toast.success(t("toast.updated"));
          onOpenChange(false);
        },
        onError: (err) => toast.error(errorText(err)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("edit.title")}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" form="edit-issue-form" variant="primary" loading={update.isPending} disabled={!titleOk}>
              {tc("actions.save")}
            </Button>
          </>
        }
      >
        <form id="edit-issue-form" onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t("edit.titleLabel")} required error={titleOk ? null : t("reportDialog.titleError")}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          </Field>
          <Field label={t("edit.descriptionLabel")}>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={5000} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
