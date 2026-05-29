"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { useAssignLocations } from "@/lib/query/hooks";
import { useToast } from "@/components/primitives/toast";
import { ApiError } from "@/lib/api/errors";
import { LocationPicker } from "./location-picker";
import type { Location, Member } from "@/lib/api/types";

export interface AssignLocationsModalProps {
  member: Member | null;
  locations: Location[];
  onClose: () => void;
}

export function AssignLocationsModal({ member, locations, onClose }: AssignLocationsModalProps) {
  const assign = useAssignLocations();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (member) setSelected(member.locations.map((l) => l.id));
  }, [member]);

  const submit = async () => {
    if (!member) return;
    try {
      await assign.mutateAsync({ membershipId: member.membershipId, location_ids: selected });
      toast.success(
        selected.length === 0
          ? `${member.name} now has organization-wide access.`
          : `Updated locations for ${member.name}.`,
      );
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update locations.");
    }
  };

  return (
    <Modal
      open={!!member}
      onOpenChange={(o) => !o && onClose()}
      title="Assign locations"
      sub={member ? member.name : undefined}
      width={460}
      footer={
        <>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon="map-pin" disabled={!member || assign.isPending} onClick={submit}>
            {assign.isPending ? "Saving…" : "Save access"}
          </Btn>
        </>
      }
    >
      <Field label="Scope" hint="No locations selected means organization-wide access.">
        <LocationPicker locations={locations} selected={selected} onChange={setSelected} />
      </Field>
    </Modal>
  );
}
