"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { useCreatePanel, useProjects, useTree } from "@/lib/query/hooks";
import type { Location } from "@/lib/api/types";

export interface AddPanelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  onCreated?: (id: string) => void;
  /** Optional default system group (e.g. when the user opens this from a group row). */
  defaultGroupId?: string;
}

export function AddPanelModal({
  open,
  onOpenChange,
  locations,
  onCreated,
  defaultGroupId,
}: AddPanelModalProps) {
  const create = useCreatePanel();
  const { data: projectList = [] } = useProjects();
  const { data: tree } = useTree();
  const [tag, setTag] = useState("");
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [customer, setCustomer] = useState("");
  const [groupId, setGroupId] = useState(defaultGroupId ?? "");
  const [locationId, setLocationId] = useState("");
  const [voltage, setVoltage] = useState("");
  const [current, setCurrent] = useState("");

  const reset = () => {
    setTag("");
    setName("");
    setSerial("");
    setCustomer("");
    setGroupId(defaultGroupId ?? "");
    setLocationId("");
    setVoltage("");
    setCurrent("");
  };

  const submit = async () => {
    if (!name) return;
    const panel = await create.mutateAsync({
      name,
      tag: tag || undefined,
      serial: serial || undefined,
      customer: customer || undefined,
      system_group_id: groupId || undefined,
      location_id: locationId || undefined,
      voltage: voltage || undefined,
      current_a: current || undefined,
    });
    reset();
    onOpenChange(false);
    onCreated?.(panel.id);
  };

  /** Flattened (project name → group rows) for the Select. */
  const groupOptions: { id: string; label: string; project: string }[] = [];
  for (const proj of tree?.projects ?? []) {
    for (const g of proj.groups) {
      groupOptions.push({ id: g.id, label: g.name, project: proj.name });
    }
  }
  // Fallback: if tree isn't loaded, just list projects so the user can pick one.
  if (groupOptions.length === 0 && projectList.length > 0) {
    // no groups yet — keep dropdown showing "Unassigned"
  }

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
            disabled={!name || create.isPending}
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
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Paketleme MCC Panosu"
            autoFocus
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tag">
            <Input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="(auto from name)"
            />
          </Field>
          <Field label="Serial">
            <Input
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="(auto-generated)"
            />
          </Field>
        </div>
        <Field label="System group">
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.project} · {g.label}
              </option>
            ))}
          </Select>
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
        <Field label="Customer">
          <Input
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="End customer / owner (optional)"
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Voltage">
            <Input value={voltage} onChange={(e) => setVoltage(e.target.value)} placeholder="400V" />
          </Field>
          <Field label="Current">
            <Input value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="800A" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
