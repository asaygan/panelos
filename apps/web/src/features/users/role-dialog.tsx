"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useMemberMutations } from "@/data/hooks";
import type { Member, Role } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { RoleChooser } from "./role-chooser";

export function RoleDialog({
  member,
  actorRole,
  onClose,
}: {
  member: Member | null;
  actorRole: Role | null;
  onClose: () => void;
}) {
  const t = useTranslations("users.changeRole");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const { changeRole } = useMemberMutations();
  const [role, setRole] = React.useState<Role>("viewer");

  React.useEffect(() => {
    if (member) setRole(member.role);
  }, [member]);

  const save = () => {
    if (!member) return;
    changeRole.mutate(
      { id: member.membership_id, role },
      {
        onSuccess: () => {
          toast.success(t("done", { name: member.name }));
          onClose();
        },
        onError: (e) => toast.error(errorText(e)),
      },
    );
  };

  return (
    <Dialog open={member !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={t("title")}
        description={member ? t("description", { name: member.name }) : undefined}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button onClick={onClose} disabled={changeRole.isPending}>
              {tc("actions.cancel")}
            </Button>
            <Button
              variant="primary"
              loading={changeRole.isPending}
              disabled={!member || role === member.role}
              onClick={save}
            >
              {tc("actions.save")}
            </Button>
          </>
        }
      >
        <RoleChooser
          name="change-role"
          value={role}
          onChange={setRole}
          disabledRoles={actorRole === "admin" ? ["owner"] : []}
        />
      </DialogContent>
    </Dialog>
  );
}
