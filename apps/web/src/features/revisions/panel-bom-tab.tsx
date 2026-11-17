"use client";

import * as React from "react";
import { ListChecks, MoreHorizontal, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { RevisionStatusBadge } from "@/components/domain/badges";
import { useBom, useBomMutations, usePermissions } from "@/data/hooks";
import type { BomItem, Panel } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { BomExportMenu } from "./bom-export-menu";
import { BomFormDialog } from "./bom-form-dialog";
import { BomImportDialog } from "./bom-import-dialog";
import { RevisionSelect, useRevisionChoice } from "./revision-choice";

function StatusCell({ status }: { status: string }) {
  const t = useTranslations("revisions.bom");
  if (status === "ok") return <Badge tone="success" dot>{t("statusOk")}</Badge>;
  if (status === "warn") return <Badge tone="warning" dot>{t("statusWarn")}</Badge>;
  return <Badge>{status}</Badge>;
}

/** Bill of materials of one revision (default: the live one). */
export function PanelBomTab({ panel }: { panel: Panel }) {
  const t = useTranslations("revisions.bom");
  const tc = useTranslations("common");
  const { can } = usePermissions();
  const confirm = useConfirm();
  const errorText = useApiError();
  const { query: revQuery, visible, selected, liveId, select } = useRevisionChoice(panel);
  const bom = useBom(selected?.id);
  const { remove } = useBomMutations(selected?.id ?? "");

  const [search, setSearch] = React.useState("");
  const [form, setForm] = React.useState<{ item: BomItem | null } | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);

  const canEdit = can("create_revision") && selected?.status === "draft";
  const rows = React.useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    const all = bom.data ?? [];
    if (!q) return all;
    return all.filter((r) =>
      [r.slot, r.ref, r.description, r.part_number, r.rating, r.type]
        .join(" ")
        .toLocaleLowerCase("tr")
        .includes(q),
    );
  }, [bom.data, search]);

  const askDelete = async (item: BomItem) => {
    const ok = await confirm({
      title: t("deleteTitle", { ref: item.ref }),
      description: t("deleteBody"),
      confirmLabel: tc("actions.delete"),
      cancelLabel: tc("actions.cancel"),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(item.id, {
      onSuccess: () => toast.success(t("deleted")),
      onError: (e) => toast.error(errorText(e)),
    });
  };

  const retry = (
    <Button onClick={() => void (revQuery.isError ? revQuery.refetch() : bom.refetch())}>
      {tc("actions.retry")}
    </Button>
  );

  if (revQuery.isLoading) return <Card><SkeletonRows rows={5} /></Card>;
  if (revQuery.isError)
    return (
      <Card>
        <ErrorState title={tc("states.errorTitle")} description={tc("states.errorHint")} action={retry} />
      </Card>
    );
  if (!selected)
    return (
      <Card>
        <EmptyState icon={<ListChecks />} title={t("noRevisionTitle")} description={t("noRevisionDescription")} />
      </Card>
    );

  const addButton = canEdit && (
    <Button variant="primary" onClick={() => setForm({ item: null })}>
      <Plus />
      {t("add")}
    </Button>
  );

  const rowMenu = (item: BomItem) =>
    canEdit && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("rowActions")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setForm({ item })}>
            <Pencil />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => void askDelete(item)}>
            <Trash2 />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {visible.length > 1 ? (
          <RevisionSelect className="w-full sm:w-72" revisions={visible} value={selected.id} onChange={select} liveId={liveId} />
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold">Rev {selected.revision_letter}</span>
            <RevisionStatusBadge status={selected.status} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {canEdit && (
            <Button onClick={() => setImportOpen(true)}>
              <Upload />
              {t("import")}
            </Button>
          )}
          {can("export_data") && panel.active_revision_id && <BomExportMenu panelId={panel.id} />}
          {addButton}
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-3 border-b border-border p-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              type="search"
              aria-label={t("searchLabel")}
              placeholder={t("search")}
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {bom.data && <span className="text-sm text-muted">{t("count", { count: rows.length })}</span>}
        </div>

        {bom.isLoading ? (
          <SkeletonRows rows={6} />
        ) : bom.isError ? (
          <ErrorState title={tc("states.errorTitle")} description={tc("states.errorHint")} action={retry} />
        ) : (bom.data ?? []).length === 0 ? (
          <EmptyState
            icon={<ListChecks />}
            title={t("emptyTitle")}
            description={canEdit ? t("emptyDescription") : `${t("emptyDescription")} ${t("readOnly")}`}
            action={addButton || undefined}
          />
        ) : rows.length === 0 ? (
          <EmptyState icon={<Search />} title={tc("states.noResults")} description={tc("states.noResultsHint")} />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <Th>{t("slot")}</Th>
                    <Th>{t("ref")}</Th>
                    <Th>{t("description")}</Th>
                    <Th>{t("partNumber")}</Th>
                    <Th>{t("rating")}</Th>
                    <Th>{t("type")}</Th>
                    <Th>{t("status")}</Th>
                    {canEdit && <Th className="w-12"><span className="sr-only">{tc("fields.actions")}</span></Th>}
                  </tr>
                </THead>
                <TBody>
                  {rows.map((r) => (
                    <Tr key={r.id}>
                      <Td className="font-mono text-sm">{r.slot}</Td>
                      <Td className="font-mono text-sm font-medium">{r.ref}</Td>
                      <Td className="min-w-48">{r.description}</Td>
                      <Td className="font-mono text-sm">{r.part_number ?? "—"}</Td>
                      <Td>{r.rating ?? "—"}</Td>
                      <Td>{r.type ?? "—"}</Td>
                      <Td><StatusCell status={r.status} /></Td>
                      {canEdit && <Td>{rowMenu(r)}</Td>}
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{r.ref}</span>
                      <span className="font-mono text-xs text-subtle">{r.slot}</span>
                      <StatusCell status={r.status} />
                    </div>
                    <p className="mt-0.5 text-base">{r.description}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {[r.part_number, r.rating, r.type].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {rowMenu(r)}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {canEdit && (
        <>
          <BomFormDialog
            revisionId={selected.id}
            item={form?.item}
            open={form !== null}
            onOpenChange={(o) => !o && setForm(null)}
          />
          <BomImportDialog revisionId={selected.id} open={importOpen} onOpenChange={setImportOpen} />
        </>
      )}
    </div>
  );
}
