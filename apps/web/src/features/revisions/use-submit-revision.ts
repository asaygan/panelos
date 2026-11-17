"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";
import { useRevisionMutations } from "@/data/hooks";
import type { Revision } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

/** "Submit for approval" with a confirm step that warns about empty revisions. */
export function useSubmitRevision() {
  const t = useTranslations("revisions.submit");
  const tc = useTranslations("common.actions");
  const tt = useTranslations("revisions.timeline");
  const confirm = useConfirm();
  const errorText = useApiError();
  const { submit } = useRevisionMutations();

  const run = async (rev: Revision) => {
    const ok = await confirm({
      title: t("title", { letter: rev.revision_letter }),
      description: rev.sheet_count === 0 ? t("zeroSheets") : t("body"),
      confirmLabel: tt("submit"),
      cancelLabel: tc("cancel"),
    });
    if (!ok) return;
    submit.mutate(rev.id, {
      onSuccess: () => toast.success(t("done", { letter: rev.revision_letter })),
      onError: (e) => toast.error(errorText(e)),
    });
  };
  return { submit: run, pending: submit.isPending };
}
