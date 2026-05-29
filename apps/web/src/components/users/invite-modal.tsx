"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { useInviteUser, useRoles } from "@/lib/query/hooks";
import { useToast } from "@/components/primitives/toast";
import { ApiError } from "@/lib/api/errors";
import { LocationPicker } from "./location-picker";
import { ROLE_DESCRIPTION, ROLE_LABEL, ROLE_ORDER } from "./role-meta";
import type { Location, Role } from "@/lib/api/types";

export interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  /** Admin actors cannot invite Owners. */
  blockOwnerRole?: boolean;
}

export function InviteModal({ open, onOpenChange, locations, blockOwnerRole }: InviteModalProps) {
  const invite = useInviteUser();
  const toast = useToast();
  const { data: roles = [] } = useRoles();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("technician");
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  const options = ROLE_ORDER.filter((r) => !(blockOwnerRole && r === "owner"));
  const description =
    roles.find((r) => r.role === role)?.permissions[0]?.description ?? ROLE_DESCRIPTION[role];

  const reset = () => {
    setEmail("");
    setRole("technician");
    setSelected([]);
    setMessage("");
  };

  const submit = async () => {
    if (!email) return;
    try {
      await invite.mutateAsync({
        email,
        role,
        location_ids: selected,
        message: message.trim() || undefined,
      });
      toast.success(`Invitation sent to ${email}.`);
      reset();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message || "That email already has a membership or pending invite.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not send invite.");
      }
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Invite member"
      sub="They'll receive an email to join your organization"
      width={460}
      footer={
        <>
          <Btn onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" icon="mail" disabled={!email || invite.isPending} onClick={submit}>
            {invite.isPending ? "Sending…" : "Send invite"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Email address">
          <Input
            placeholder="name@company.com"
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Role">
          <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {options.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
          <div style={{ fontSize: "var(--fz-xs)", color: "var(--c-ink-4)", marginTop: 5 }}>
            {description}
          </div>
        </Field>
        <Field label="Assign to locations" hint="Leave empty for organization-wide access.">
          <LocationPicker locations={locations} selected={selected} onChange={setSelected} />
        </Field>
        <Field label="Message (optional)">
          <textarea
            className="input"
            rows={3}
            placeholder="Add a note to the invitation email…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>
      </div>
    </Modal>
  );
}
