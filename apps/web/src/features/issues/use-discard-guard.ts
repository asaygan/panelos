"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/components/ui/confirm";

/**
 * Wraps a dialog's onOpenChange so that closing with unsaved edits asks first.
 * The dialog body keeps `dirtyRef.current` up to date.
 */
export function useDiscardGuard(onOpenChange: (open: boolean) => void) {
  const t = useTranslations("common.states");
  const confirm = useConfirm();
  const dirtyRef = React.useRef(false);

  const guarded = (next: boolean) => {
    if (next || !dirtyRef.current) return onOpenChange(next);
    void confirm({
      title: t("unsavedTitle"),
      description: t("unsavedBody"),
      confirmLabel: t("unsavedDiscard"),
      cancelLabel: t("unsavedKeep"),
      destructive: true,
    }).then((ok) => {
      if (ok) onOpenChange(false);
    });
  };

  return { dirtyRef, guarded };
}
