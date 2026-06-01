"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { useCreatePanel, usePanelSets } from "@/lib/query/hooks";
import type { Location } from "@/lib/api/types";

export interface AddPanelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  onCreated?: (id: string) => void;
}

export function AddPanelModal({ open, onOpenChange, locations, onCreated }: AddPanelModalProps) {
  const create = useCreatePanel();
  const { data: panelSets = [] } = usePanelSets();
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [customer, setCustomer] = useState("");
  const [panelSetId, setPanelSetId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");

  const reset = () => {
    setTag("");
    setName("");
    setSerial("");
    setCustomer("");
    setPanelSetId("");
    setLocationId("");
    setVoltage("");
    setCurrent("");
  };

  const submit = async () => {
    if (!tag || !name || !serial) return;
    const panel = await create.mutateAsync({
      tag,
      name,
      serial,
      customer: customer || undefined,
      panel_set_id: panelSetId || undefined,
      location_id: locationId || undefined,
      voltage: voltage || undefined,
      current_a: current || undefined,
    });
    reset();
    onOpenChange(false);
    onCreated?.(panel.id);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Add panel"
      sub="Create a new asset record"
      width={460}
      footer={
        <>
          <Btn onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn
            variant="primary"
            icon="plus"
            disabled={!tag || !name || !serial || create.isPending}
            onClick={submit}
          >
            {create.isPending ? "Creating…" : "Create panel"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {create.isError && (
          <div style={{ fontSize: 12, color: "var(--c-fault)" }}>
            Could not create panel. Check your permissions and try again.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tag">
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="MCC-6" autoFocus />
          </Field>
          <Field label="Serial">
            <Input value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="MCC-L6-0001" />
          </Field>
        </div>
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="MCC Line 6" />
        </Field>
        <Field label="Customer">
          <Input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="End customer / owner (optional)"
          />
        </Field>
        <Field label="Panel set">
          <Select value={panelSetId} onChange={(e) => setPanelSetId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {panelSets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Voltage">
            <Input value={voltage} onChange={(e) => setVoltage(e.target.value)} placeholder="480V" />
          </Field>
          <Field label="Current">
            <Input value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="800A" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
