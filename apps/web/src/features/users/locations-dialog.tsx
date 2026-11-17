"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMemberMutations } from "@/data/hooks";
import type { Member } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { LOCATION_RESTRICTED } from "./guards";
import { LocationChecklist } from "./location-checklist";

export function LocationsDialog({ member, onClose }: { member: Member | null; onClose: () => void }) {
  const t = useTranslations("users.locations");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const { setLocations } = useMemberMutations();
  const [ids, setIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (member) setIds((member.assigned_locations ?? []).map((l) => l.id));
  }, [member]);

  const save = () => {
    if (!member) return;
    setLocations.mutate(
      { id: member.membership_id, locationIds: ids },
      {
        onSuccess: () => {
          toast.success(t("done", { name: member.name }));
          onClose();
        },
        onError: (e) => toast.error(errorText(e)),
      },
    );
  };

  const unrestricted = member ? !LOCATION_RESTRICTED.includes(member.role) : false;

  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t("title")}
        description={member ? t("description", { name: member.name }) : undefined}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button onClick={onClose} disabled={setLocations.isPending}>
              {tc("actions.cancel")}
            </Button>
            <Button variant="primary" loading={setLocations.isPending} onClick={save}>
              {tc("actions.save")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">{t("explain")}</p>
          {unrestricted && (
            <p className="rounded-lg border border-info/20 bg-info-soft px-3 py-2 text-sm text-info">
              {t("adminNote")}
            </p>
          )}
          <LocationChecklist value={ids} onChange={setIds} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
