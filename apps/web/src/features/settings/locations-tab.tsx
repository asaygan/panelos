"use client";

import * as React from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { useLocationMutations, useLocations } from "@/data/hooks";
import type { Location } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { LocationDialog } from "./location-dialog";

export function LocationsTab({ readOnly }: { readOnly: boolean }) {
  const t = useTranslations("settings.locations");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const confirm = useConfirm();
  const { data, isLoading, isError, refetch } = useLocations();
  const { remove } = useLocationMutations();
  const [dialog, setDialog] = React.useState<{ location: Location | null } | null>(null);

  const askRemove = async (loc: Location) => {
    const ok = await confirm({
      title: t("delete.title", { name: loc.name }),
      description: t("delete.description"),
      confirmLabel: tc("actions.delete"),
      cancelLabel: tc("actions.cancel"),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(loc.id, {
      onSuccess: () => toast.success(t("delete.done")),
      onError: (e) => toast.error(errorText(e)),
    });
  };

  const addButton = (
    <Button variant="primary" size="sm" onClick={() => setDialog({ location: null })}>
      <Plus />
      {t("add")}
    </Button>
  );

  return (
    <Card>
      <CardHeader
        title={t("title")}
        description={t("description")}
        actions={!readOnly && data && data.length > 0 ? addButton : undefined}
      />
      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <ErrorState
          title={tc("states.errorTitle")}
          description={tc("states.errorHint")}
          action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<MapPin />}
          title={t("empty.title")}
          description={t("empty.description")}
          action={readOnly ? undefined : addButton}
        />
      ) : (
        <Table>
          <THead>
            <tr>
              <Th>{tc("fields.code")}</Th>
              <Th>{tc("fields.name")}</Th>
              <Th>{t("region")}</Th>
              {!readOnly && (
                <Th className="w-24 text-right">
                  <span className="sr-only">{tc("fields.actions")}</span>
                </Th>
              )}
            </tr>
          </THead>
          <TBody>
            {data.map((loc) => (
              <Tr key={loc.id}>
                <Td className="font-mono text-sm font-medium">{loc.code}</Td>
                <Td>{loc.name}</Td>
                <Td className="text-muted">{loc.region ?? "—"}</Td>
                {!readOnly && (
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`${tc("actions.edit")}: ${loc.name}`}
                        onClick={() => setDialog({ location: loc })}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="danger-ghost"
                        size="icon-sm"
                        aria-label={`${tc("actions.delete")}: ${loc.name}`}
                        onClick={() => void askRemove(loc)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
      <LocationDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
        location={dialog?.location ?? null}
      />
    </Card>
  );
}
