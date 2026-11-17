"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DragKind, PendingMove, TreeIndex } from "./model";
import { fold } from "./model";

export interface MoveTarget {
  kind: DragKind;
  id: string;
  label: string;
  /** Current group id (null = unassigned) or panel id. */
  fromId: string | null;
}

interface Option {
  id: string | null;
  value: string;
  label: string;
  hint?: string;
}

function buildOptions(kind: DragKind, index: TreeIndex, unassignedLabel: string): Option[] {
  if (kind === "panel") {
    const opts: Option[] = [{ id: null, value: "__unassigned", label: unassignedLabel }];
    for (const { group, project } of index.groups) {
      opts.push({ id: group.id, value: group.id, label: group.name, hint: project.name });
    }
    return opts;
  }
  const opts: Option[] = [];
  for (const e of index.entries.values()) {
    if (e.kind === "panel") opts.push({ id: e.node.id, value: e.node.id, label: `${e.node.tag} · ${e.node.name}`, hint: e.node.group_name ?? undefined });
  }
  return opts;
}

/** "Move to…" picker: the keyboard / phone alternative to drag and drop. */
export function MoveDialog({
  target,
  index,
  onClose,
  onMove,
}: {
  target: MoveTarget | null;
  index: TreeIndex;
  onClose: () => void;
  onMove: (move: PendingMove) => Promise<boolean>;
}) {
  const t = useTranslations("panels.moveDialog");
  const tc = useTranslations("common.actions");
  const tr = useTranslations("panels.row");
  const [choice, setChoice] = React.useState<Option | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setChoice(null);
  }, [target?.id]);

  const options = React.useMemo(
    () => (target ? buildOptions(target.kind, index, tr("unassigned")) : []),
    [target, index, tr],
  );

  if (!target) return null;

  const submit = async () => {
    if (!choice) return;
    setBusy(true);
    const ok = await onMove({
      kind: target.kind,
      id: target.id,
      label: target.label,
      targetId: choice.id,
      targetLabel: choice.label,
    });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent
        title={t(target.kind === "panel" ? "titlePanel" : "titleCabinet", { name: target.label })}
        description={t("helper")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              {tc("cancel")}
            </Button>
            <Button variant="primary" disabled={!choice} loading={busy} onClick={submit}>
              {tc("move")}
            </Button>
          </>
        }
      >
        <Command
          filter={(value, search) => (fold(value).includes(fold(search)) ? 1 : 0)}
          className="rounded border border-border"
        >
          <Command.Input
            placeholder={t("search")}
            className="h-10 w-full border-b border-border bg-transparent px-3 text-base outline-none placeholder:text-subtle"
          />
          <Command.List className="scroll-thin max-h-64 overflow-y-auto p-1">
            <Command.Empty className="py-6 text-center text-sm text-muted">{t("empty")}</Command.Empty>
            {options.map((o) => {
              const current = o.id === target.fromId;
              return (
                <Command.Item
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""} ${o.value}`}
                  disabled={current}
                  onSelect={() => setChoice(o)}
                  className="flex cursor-default items-center gap-2 rounded px-2 py-1.5 data-[disabled=true]:opacity-50 data-[selected=true]:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base">{o.label}</div>
                    {o.hint && <div className="truncate text-xs text-subtle">{o.hint}</div>}
                  </div>
                  {current && <span className="text-xs text-subtle">{t("current")}</span>}
                  {choice?.value === o.value && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
