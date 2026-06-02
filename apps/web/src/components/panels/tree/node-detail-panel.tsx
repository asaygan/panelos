"use client";

import { useEffect, useMemo, useState } from "react";
import { Empty } from "@/components/primitives/empty";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Btn } from "@/components/primitives/button";
import { Icon } from "@/components/icons/icon";
import {
  useUpdatePanel,
  useUpdatePanelSet,
  useUpdateSection,
  useDeleteSection,
} from "@/lib/query/hooks";
import { SECTION_TYPE_META } from "@/lib/api/adapters";
import type { NodeRef } from "./selection";
import type { Panel, PanelSetNode, Section, SectionType } from "@/lib/api/types";

const TYPE_OPTIONS = Object.entries(SECTION_TYPE_META) as [SectionType, { label: string; icon: string }][];

export interface NodeDetailPanelProps {
  selected: NodeRef | null;
  sets: PanelSetNode[];
  unassigned: Panel[];
}

const Header = ({ kind, title, sub }: { kind: string; title: string; sub?: string }) => (
  <div
    style={{
      padding: "14px 16px",
      borderBottom: "1px solid var(--c-line)",
      background: "var(--c-surface-2)",
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: "var(--c-ink-3)",
        textTransform: "uppercase",
        letterSpacing: ".08em",
      }}
    >
      {kind}
    </div>
    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{title}</div>
    {sub && (
      <div style={{ fontSize: 11, color: "var(--c-ink-3)", marginTop: 2 }}>{sub}</div>
    )}
  </div>
);

export function NodeDetailPanel({ selected, sets, unassigned }: NodeDetailPanelProps) {
  if (selected == null) {
    return (
      <Empty
        icon="layout-grid"
        title="Select a node"
        sub="Pick a panel set, panel, or section on the left to edit it here."
      />
    );
  }

  if (selected.kind === "set") {
    const s = sets.find((x) => x.id === selected.id);
    if (!s) return <Empty icon="alert-triangle" title="Panel set not found" />;
    return <SetEditor key={s.id} set={s} />;
  }

  const allPanels: Panel[] = [...sets.flatMap((s) => s.panels), ...unassigned];
  if (selected.kind === "panel") {
    const p = allPanels.find((x) => x.id === selected.id);
    if (!p) return <Empty icon="alert-triangle" title="Panel not found" />;
    return <PanelEditor key={p.id} panel={p} />;
  }

  const allSections: Section[] = allPanels.flatMap((p) => p.sections ?? []);
  const sec = allSections.find((x) => x.id === selected.id);
  if (!sec) return <Empty icon="alert-triangle" title="Section not found" />;
  const parent = allPanels.find((p) => p.id === sec.panel_id);
  return <SectionEditor key={sec.id} section={sec} parentPanelTag={parent?.tag} />;
}

// ─── Panel Set editor ───────────────────────────────────────────────────────

function SetEditor({ set }: { set: PanelSetNode }) {
  const mut = useUpdatePanelSet();
  const [name, setName] = useState(set.name);
  const [code, setCode] = useState(set.code ?? "");
  const [description, setDescription] = useState(set.description ?? "");

  useEffect(() => {
    setName(set.name);
    setCode(set.code ?? "");
    setDescription(set.description ?? "");
  }, [set.id, set.name, set.code, set.description]);

  const save = (patch: Partial<{ name: string; code: string; description: string }>) => {
    const body: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(patch)) {
      body[k] = (v ?? "").trim() === "" ? null : (v as string).trim();
    }
    if (Object.keys(body).length === 0) return;
    mut.mutate({ id: set.id, body: body as never });
  };

  return (
    <div>
      <Header kind="Panel set" title={set.name} sub={`${set.panels.length} panels`} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name !== set.name && save({ name })}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <Field label="Code">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => code !== (set.code ?? "") && save({ code })}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() =>
              description !== (set.description ?? "") && save({ description })
            }
          />
        </Field>
      </div>
    </div>
  );
}

// ─── Panel editor ────────────────────────────────────────────────────────────

function PanelEditor({ panel }: { panel: Panel }) {
  const mut = useUpdatePanel();
  const [fields, setFields] = useState({
    tag: panel.tag,
    name: panel.name,
    serial: panel.serial,
    voltage: panel.volt ?? "",
    current_a: panel.amp ?? "",
    ip_class: panel.enclosure ?? "",
    customer: panel.customer ?? "",
  });

  useEffect(() => {
    setFields({
      tag: panel.tag,
      name: panel.name,
      serial: panel.serial,
      voltage: panel.volt ?? "",
      current_a: panel.amp ?? "",
      ip_class: panel.enclosure ?? "",
      customer: panel.customer ?? "",
    });
  }, [panel.id, panel.tag, panel.name, panel.serial, panel.volt, panel.amp, panel.enclosure, panel.customer]);

  const setField = (k: keyof typeof fields, v: string) =>
    setFields((f) => ({ ...f, [k]: v }));

  const save = (key: keyof typeof fields, current: string) => {
    const original = {
      tag: panel.tag,
      name: panel.name,
      serial: panel.serial,
      voltage: panel.volt ?? "",
      current_a: panel.amp ?? "",
      ip_class: panel.enclosure ?? "",
      customer: panel.customer ?? "",
    }[key];
    if (current === original) return;
    mut.mutate({ id: panel.id, body: { [key]: current || null } as never });
  };

  return (
    <div>
      <Header kind="Panel" title={panel.tag} sub={panel.name} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Tag">
          <Input
            value={fields.tag}
            onChange={(e) => setField("tag", e.target.value)}
            onBlur={() => save("tag", fields.tag)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <Field label="Name">
          <Input
            value={fields.name}
            onChange={(e) => setField("name", e.target.value)}
            onBlur={() => save("name", fields.name)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <Field label="Serial">
          <Input
            value={fields.serial}
            onChange={(e) => setField("serial", e.target.value)}
            onBlur={() => save("serial", fields.serial)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Voltage">
            <Input
              value={fields.voltage}
              onChange={(e) => setField("voltage", e.target.value)}
              onBlur={() => save("voltage", fields.voltage)}
            />
          </Field>
          <Field label="Current">
            <Input
              value={fields.current_a}
              onChange={(e) => setField("current_a", e.target.value)}
              onBlur={() => save("current_a", fields.current_a)}
            />
          </Field>
        </div>
        <Field label="IP / enclosure">
          <Input
            value={fields.ip_class}
            onChange={(e) => setField("ip_class", e.target.value)}
            onBlur={() => save("ip_class", fields.ip_class)}
          />
        </Field>
        <Field label="Customer">
          <Input
            value={fields.customer}
            onChange={(e) => setField("customer", e.target.value)}
            onBlur={() => save("customer", fields.customer)}
          />
        </Field>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingTop: 6,
            color: "var(--c-ink-3)",
            fontSize: 11,
          }}
        >
          <Icon name="qr-code" size={13} />
          QR token{" "}
          <span className="mono" style={{ color: "var(--c-ink-2)" }}>
            {panel.qr_token}
          </span>{" "}
          (immutable)
        </div>
      </div>
    </div>
  );
}

// ─── Section editor ──────────────────────────────────────────────────────────

function SectionEditor({
  section,
  parentPanelTag,
}: {
  section: Section;
  parentPanelTag?: string;
}) {
  const mut = useUpdateSection(section.panel_id);
  const del = useDeleteSection(section.panel_id);
  const [name, setName] = useState(section.name);
  const [type, setType] = useState<SectionType>(section.section_type);
  const [description, setDescription] = useState(section.description ?? "");

  useEffect(() => {
    setName(section.name);
    setType(section.section_type);
    setDescription(section.description ?? "");
  }, [section.id, section.name, section.section_type, section.description]);

  const meta = useMemo(() => SECTION_TYPE_META[section.section_type], [section.section_type]);

  return (
    <div>
      <Header kind="Section" title={section.name} sub={meta.label} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() =>
              name !== section.name && mut.mutate({ id: section.id, body: { name } })
            }
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <Field label="Type">
          <Select
            value={type}
            onChange={(e) => {
              const next = e.target.value as SectionType;
              setType(next);
              if (next !== section.section_type)
                mut.mutate({ id: section.id, body: { section_type: next } });
            }}
          >
            {TYPE_OPTIONS.map(([value, m]) => (
              <option key={value} value={value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() =>
              description !== (section.description ?? "") &&
              mut.mutate({ id: section.id, body: { description: description || null } as never })
            }
          />
        </Field>
        {parentPanelTag && (
          <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>
            Parent panel:{" "}
            <span className="mono" style={{ color: "var(--c-ink-2)" }}>
              {parentPanelTag}
            </span>
          </div>
        )}
        <div style={{ paddingTop: 6 }}>
          <Btn
            variant="ghost"
            size="sm"
            icon="x"
            onClick={() => {
              if (window.confirm(`Delete section "${section.name}"?`)) del.mutate(section.id);
            }}
          >
            Delete section
          </Btn>
        </div>
      </div>
    </div>
  );
}
