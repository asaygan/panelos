"use client";

import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { useRemoveMember } from "@/lib/query/hooks";
import { useToast } from "@/components/primitives/toast";
import { ApiError } from "@/lib/api/errors";
import type { Member } from "@/lib/api/types";

export interface RemoveMemberModalProps {
  member: Member | null;
  onClose: () => void;
}

export function RemoveMemberModal({ member, onClose }: RemoveMemberModalProps) {
  const remove = useRemoveMember();
  const toast = useToast();

  const submit = async () => {
    if (!member) return;
    try {
      await remove.mutateAsync(member.membershipId);
      toast.success(`${member.name} removed from the organization.`);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove member.");
    }
  };

  return (
    <Modal
      open={!!member}
      onOpenChange={(o) => !o && onClose()}
      title="Remove member"
      sub={member ? member.email : undefined}
      width={420}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" icon="x" disabled={!member || remove.isPending} onClick={submit}>
            {remove.isPending ? "Removing…" : "Remove member"}
          </Btn>
        </>
      }
    >
      <p style={{ fontSize: "var(--fz)", color: "var(--c-ink-2)", margin: 0 }}>
        {member?.name} will immediately lose access to this organization. This cannot be undone.
      </p>
    </Modal>
  );
}
