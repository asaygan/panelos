"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { Select } from "@/components/primitives/select";
import { useChangeRole, useRoles } from "@/lib/query/hooks";
import { useToast } from "@/components/primitives/toast";
import { ApiError } from "@/lib/api/errors";
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLE_ORDER } from "./role-meta";
import type { Member, Role } from "@/lib/api/types";

export interface ChangeRoleModalProps {
  member: Member | null;
  onClose: () => void;
  /** Admin actors cannot assign the Owner role. */
  blockOwnerRole: boolean;
}

export function ChangeRoleModal({ member, onClose, blockOwnerRole }: ChangeRoleModalProps) {
  const change = useChangeRole();
  const toast = useToast();
  const { data: roles = [] } = useRoles();
  const [role, setRole] = useState<Role>("viewer");

  useEffect(() => {
    if (member) setRole(member.role);
  }, [member]);

  const options = ROLE_ORDER.filter((r) => !(blockOwnerRole && r === "owner"));
  const description =
    roles.find((r) => r.role === role)?.permissions[0]?.description ?? ROLE_DESCRIPTION[role];

  const submit = async () => {
    if (!member) return;
    try {
      await change.mutateAsync({ membershipId: member.membershipId, role });
      toast.success(`${member.name} is now ${ROLE_LABEL[role]}.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not change role.");
    }
  };

  return (
    <Modal
      open={!!member}
      onOpenChange={(o) => !o && onClose()}
      title="Change role"
      sub={member ? member.name : undefined}
      width={420}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            icon="shield"
            disabled={!member || change.isPending || role === member?.role}
            onClick={submit}
          >
            {change.isPending ? "Saving…" : "Save role"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {options.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </Field>
        <div style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-3)" }}>{description}</div>
      </div>
    </Modal>
  );
}
