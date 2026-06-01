"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { useCreatePanelSet } from "@/lib/query/hooks";
import type { Location } from "@/lib/api/types";

export interface AddPanelSetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  onCreated?: (id: string) => void;
}

export function AddPanelSetModal({ open, onOpenChange, locations, onCreated }: AddPanelSetModalProps) {
  const create = useCreatePanelSet();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [locationId, setLocationId] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setName("");
    setCode("");
    setLocationId("");
    setDescription("");
  };

  const submit = async () => {
    if (!name) return;
    const ps = await create.mutateAsync({
      name,
      code: code || undefined,
      location_id: locationId || undefined,
      description: description || undefined,
    });
    reset();
    onOpenChange(false);
    onCreated?.(ps.id);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Add panel set"
      sub="A facility or process system that groups panels"
      width={460}
      footer={
        <>
          <Btn onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn
            variant="primary"
            icon="plus"
            disabled={!name || create.isPending}
            onClick={submit}
          >
            {create.isPending ? "Creating…" : "Create set"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {create.isError && (
          <div style={{ fontSize: 12, color: "var(--c-fault)" }}>
            Could not create the panel set. Check your permissions and try again.
          </div>
        )}
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Water Treatment Plant Electrical System"
            autoFocus
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WTP" />
          </Field>
          <Field label="Location">
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">— None —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </Field>
      </div>
    </Modal>
  );
}
