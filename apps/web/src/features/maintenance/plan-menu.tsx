"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { toast } from "@/components/ui/toaster";
import { useMaintenanceMutations } from "@/data/hooks";
import type { MaintenancePlan } from "@/data/types";
import { errorCode, useApiError } from "@/lib/use-api-error";

/** Edit / (de)activate / delete for a plan. Deleting a plan with history offers deactivation. */
export function PlanMenu({ plan, onEdit }: { plan: MaintenancePlan; onEdit: (plan: MaintenancePlan) => void }) {
  const t = useTranslations("maintenance.plan");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const errorText = useApiError();
  const { updatePlan, deletePlan } = useMaintenanceMutations();

  const setActive = (active: boolean) =>
    updatePlan.mutate(
      { id: plan.id, body: { active } },
      {
        onSuccess: () => toast.success(t(active ? "activated" : "deactivated")),
        onError: (e) => toast.error(errorText(e)),
      },
    );

  const remove = async () => {
    const ok = await confirm({
      title: t("deleteTitle"),
      description: t("deleteBody", { title: plan.title }),
      confirmLabel: tc("actions.delete"),
      cancelLabel: tc("actions.cancel"),
      destructive: true,
    });
    if (!ok) return;
    deletePlan.mutate(plan.id, {
      onSuccess: () => toast.success(t("deleted")),
      onError: async (e) => {
        if (errorCode(e) !== "plan_in_use") return toast.error(errorText(e));
        if (
          plan.active &&
          (await confirm({
            title: t("inUseTitle"),
            description: t("inUseBody"),
            confirmLabel: t("deactivateAction"),
            cancelLabel: tc("actions.cancel"),
          }))
        )
          setActive(false);
        else if (!plan.active) toast.error(errorText(e));
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("more")}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={() => onEdit(plan)}>
          <Pencil />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setActive(!plan.active)}>
          <Power />
          {t(plan.active ? "deactivate" : "activate")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void remove()}>
          <Trash2 />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
