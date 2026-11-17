"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm";
import { useCabinetMutations, usePanelMutations, useTreeMutations } from "@/data/hooks";
import { useApiError } from "@/lib/use-api-error";
import type { IndexEntry } from "./model";

/** Every tree mutation with confirmation, toast feedback and translated errors. Each resolves true on success. */
export function useTreeActions() {
  const t = useTranslations("panels");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const errorText = useApiError();
  const treeM = useTreeMutations();
  const panelM = usePanelMutations();
  const cabinetM = useCabinetMutations();

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
      return true;
    } catch (e) {
      toast.error(errorText(e));
      return false;
    }
  };

  return {
    createGroup: (projectId: string, name: string) =>
      run(() => treeM.createGroup.mutateAsync({ projectId, body: { name, group_type: "custom", lifecycle_status: "draft" } }), t("toast.groupCreated")),
    /** groupId null = the Unassigned bucket. */
    createPanel: (groupId: string | null, name: string) =>
      run(
        () => panelM.create.mutateAsync(groupId ? { name, system_group_id: groupId } : { name }),
        t("toast.panelCreated"),
      ),
    createCabinet: (panelId: string, name: string) =>
      run(() => cabinetM.create.mutateAsync({ panelId, body: { name } }), t("toast.cabinetCreated")),

    movePanel: (id: string, groupId: string | null) =>
      run(
        () => panelM.update.mutateAsync({ id, body: { system_group_id: groupId } }),
        t("toast.moved"),
      ),
    moveCabinet: (id: string, panelId: string) =>
      run(() => cabinetM.move.mutateAsync({ id, panelId }), t("toast.moved")),

    /** Archive a project or panel (after explaining what it means). */
    archive: async (entry: IndexEntry): Promise<boolean> => {
      if (entry.kind === "project") {
        const groups = entry.node.groups ?? [];
        const panels = groups.reduce((n, g) => n + (g.panels?.length ?? 0), 0);
        const ok = await confirm({
          title: t("confirm.archiveProject.title", { name: entry.node.name }),
          description: t("confirm.archiveProject.body", { groups: groups.length, panels }),
          confirmLabel: tc("actions.archive"),
          cancelLabel: tc("actions.cancel"),
          destructive: true,
        });
        return ok && run(() => treeM.archiveProject.mutateAsync(entry.node.id), t("toast.archived"));
      }
      if (entry.kind === "panel") {
        const ok = await confirm({
          title: t("confirm.archivePanel.title", { name: entry.node.name }),
          description: t("confirm.archivePanel.body", { tag: entry.node.tag }),
          confirmLabel: tc("actions.archive"),
          cancelLabel: tc("actions.cancel"),
          destructive: true,
        });
        return ok && run(() => panelM.archive.mutateAsync(entry.node.id), t("toast.archived"));
      }
      return false;
    },

    /** Delete a system group or cabinet. */
    remove: async (entry: IndexEntry): Promise<boolean> => {
      if (entry.kind === "group") {
        const ok = await confirm({
          title: t("confirm.deleteGroup.title", { name: entry.node.name }),
          description: t("confirm.deleteGroup.body", { panels: entry.node.panels?.length ?? 0 }),
          confirmLabel: tc("actions.delete"),
          cancelLabel: tc("actions.cancel"),
          destructive: true,
        });
        return ok && run(() => treeM.deleteGroup.mutateAsync(entry.node.id), tc("states.deleted"));
      }
      if (entry.kind === "cabinet") {
        const ok = await confirm({
          title: t("confirm.deleteCabinet.title", { name: entry.node.name }),
          description: t("confirm.deleteCabinet.body"),
          confirmLabel: tc("actions.delete"),
          cancelLabel: tc("actions.cancel"),
          destructive: true,
        });
        return ok && run(() => cabinetM.remove.mutateAsync(entry.node.id), tc("states.deleted"));
      }
      return false;
    },
  };
}

export type TreeActions = ReturnType<typeof useTreeActions>;
