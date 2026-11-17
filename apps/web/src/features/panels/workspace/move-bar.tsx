"use client";

import { ArrowRightLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PendingMove } from "./model";

/** Confirmation bar shown after a drop, before anything is sent to the API. */
export function MoveBar({
  move,
  busy,
  onConfirm,
  onCancel,
}: {
  move: PendingMove;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("panels.moveBar");
  const tc = useTranslations("common.actions");
  const text =
    move.kind === "cabinet"
      ? t("cabinet", { name: move.label, target: move.targetLabel })
      : move.targetId === null
        ? t("panelUnassigned", { name: move.label })
        : t("panelGroup", { name: move.label, target: move.targetLabel });
  return (
    <div
      role="alertdialog"
      aria-label={t("title")}
      className="sticky bottom-3 z-30 mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-lg border border-primary/30 bg-surface p-3 shadow-lg sm:flex-row sm:items-center"
    >
      <ArrowRightLeft className="hidden size-5 shrink-0 text-primary sm:block" aria-hidden />
      <p className="min-w-0 flex-1 text-base">{text}</p>
      <div className="flex gap-2 sm:shrink-0">
        <Button variant="secondary" className="flex-1 sm:flex-none" onClick={onCancel} disabled={busy}>
          {t("cancel")}
        </Button>
        <Button variant="primary" className="flex-1 sm:flex-none" onClick={onConfirm} loading={busy} autoFocus>
          {tc("confirm")}
        </Button>
      </div>
    </div>
  );
}
