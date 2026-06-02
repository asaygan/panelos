"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { useCreateProject } from "@/lib/query/hooks";
import type { Location } from "@/lib/api/types";

export interface AddProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  onCreated?: (id: string) => void;
}

export function AddProjectModal({
  open,
  onOpenChange,
  locations,
  onCreated,
}: AddProjectModalProps) {
  const create = useCreateProject();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [customer, setCustomer] = useState("");
  const [site, setSite] = useState("");
  const [locationId, setLocationId] = useState("");

  const reset = () => {
    setName("");
    setCode("");
    setCustomer("");
    setSite("");
    setLocationId("");
  };

  const submit = async () => {
    if (!name) return;
    const proj = await create.mutateAsync({
      name,
      code: code || undefined,
      customer: customer || undefined,
      site: site || undefined,
      location_id: locationId || undefined,
    } as never);
    reset();
    onOpenChange(false);
    onCreated?.(proj.id);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Add project"
      sub="A facility or site (e.g. Haddehane, Su Arıtma Tesisi)"
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
            {create.isPending ? "Creating…" : "Create project"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Haddehane"
            autoFocus
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Code">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="HDH" />
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
        <Field label="Customer">
          <Input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="Eastgate Steel"
          />
        </Field>
        <Field label="Site">
          <Input
            value={site}
            onChange={(e) => setSite(e.target.value)}
            placeholder="Buffalo, NY"
          />
        </Field>
      </div>
    </Modal>
  );
}
