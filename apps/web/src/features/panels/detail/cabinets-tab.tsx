"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Boxes, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { useCabinetMutations, useCabinets, usePermissions } from "@/data/hooks";
import type { Cabinet, Panel } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { CabinetDialog } from "./cabinet-dialog";

/** Position updates needed to move item `from` to `to` in an ordered list. */
function reorder(list: Cabinet[], from: number, to: number): { id: string; position: number }[] {
  const order = [...list];
  const moved = order.splice(from, 1);
  order.splice(to, 0, ...moved);
  const slots = list.map((c) => c.position);
  const distinct = new Set(slots).size === slots.length;
  const updates: { id: string; position: number }[] = [];
  order.forEach((c, i) => {
    const position = distinct ? (slots[i] ?? i) : i;
    if (c.position !== position) updates.push({ id: c.id, position });
  });
  return updates;
}

export function CabinetsTab({ panel }: { panel: Panel }) {
  const t = useTranslations("panelDetail.cabinets");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const canEdit = can("crud_panels");
  const { data, isLoading, error, refetch, isFetching } = useCabinets(panel.id);
  const { update, remove } = useCabinetMutations();
  const [dialog, setDialog] = React.useState<{ cabinet?: Cabinet } | null>(null);
  const [moving, setMoving] = React.useState(false);

  const cabinets = React.useMemo(
    () => [...(data ?? [])].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name)),
    [data],
  );

  const move = async (from: number, to: number) => {
    setMoving(true);
    try {
      await Promise.all(
        reorder(cabinets, from, to).map((u) => update.mutateAsync({ id: u.id, body: { position: u.position } })),
      );
      toast.success(t("moved"));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setMoving(false);
    }
  };

  const del = async (c: Cabinet) => {
    const ok = await confirm({
      title: t("deleteTitle", { name: c.name }),
      description: t("deleteBody"),
      confirmLabel: tc("actions.delete"),
      cancelLabel: tc("actions.cancel"),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(c.id, {
      onSuccess: () => toast.success(t("deleted")),
      onError: (e) => toast.error(errorText(e)),
    });
  };

  const addButton = canEdit ? (
    <Button variant="primary" size="sm" onClick={() => setDialog({})}>
      <Plus />
      {t("add")}
    </Button>
  ) : undefined;

  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} actions={cabinets.length > 0 ? addButton : undefined} />
      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : error ? (
        <ErrorState
          title={t("loadError")}
          description={tc("states.errorHint")}
          action={
            <Button loading={isFetching} onClick={() => void refetch()}>
              {tc("actions.retry")}
            </Button>
          }
        />
      ) : cabinets.length === 0 ? (
        <EmptyState
          icon={<Boxes />}
          title={t("emptyTitle")}
          description={canEdit ? t("emptyBody") : t("emptyReadOnly")}
          action={addButton}
        />
      ) : (
        <ul className="divide-y divide-border">
          {cabinets.map((c, i) => (
            <li key={c.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-medium">{c.name}</span>
                  {c.code && (
                    <Badge tone="outline" className="font-mono">
                      {c.code}
                    </Badge>
                  )}
                </div>
                {c.notes && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-muted">{c.notes}</p>}
              </div>
              {canEdit && (
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("moveUp")}
                    disabled={i === 0 || moving}
                    onClick={() => void move(i, i - 1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("moveDown")}
                    disabled={i === cabinets.length - 1 || moving}
                    onClick={() => void move(i, i + 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={tc("actions.edit")} onClick={() => setDialog({ cabinet: c })}>
                    <Pencil />
                  </Button>
                  <Button variant="danger-ghost" size="icon-sm" aria-label={tc("actions.delete")} onClick={() => void del(c)}>
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {dialog && (
        <CabinetDialog
          key={dialog.cabinet?.id ?? "new"}
          open
          onOpenChange={(o) => !o && setDialog(null)}
          panelId={panel.id}
          cabinet={dialog.cabinet}
        />
      )}
    </Card>
  );
}
