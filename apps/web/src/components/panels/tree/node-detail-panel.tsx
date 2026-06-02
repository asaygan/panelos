"use client";

import { useEffect, useState } from "react";
import { Empty } from "@/components/primitives/empty";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Btn } from "@/components/primitives/button";
import { Icon } from "@/components/icons/icon";
import {
  useArchiveProject,
  useDeleteCabinet,
  useDeleteSystemGroup,
  useUpdateCabinet,
  useUpdatePanel,
  useUpdateProject,
  useUpdateSystemGroup,
} from "@/lib/query/hooks";
import { GROUP_TYPE_META } from "@/lib/api/adapters";
import { PANEL_STATUS_ORDER, STATUS_META, type PanelStatus } from "@/lib/utils/status";
import type { NodeRef } from "./selection";
import type {
  Cabinet,
  GroupType,
  Panel,
  ProjectNode,
  SystemGroup,
} from "@/lib/api/types";

const GROUP_TYPE_OPTIONS = Object.entries(GROUP_TYPE_META) as [
  GroupType,
  { label: string; icon: string },
][];

export interface NodeDetailPanelProps {
  selected: NodeRef | null;
  projects: ProjectNode[];
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
    {sub && <div style={{ fontSize: 11, color: "var(--c-ink-3)", marginTop: 2 }}>{sub}</div>}
  </div>
);

export function NodeDetailPanel({ selected, projects, unassigned }: NodeDetailPanelProps) {
  if (selected == null) {
    return (
      <Empty
        icon="layout-grid"
        title="Select a node"
        sub="Pick a project, system group, panel, or cabinet on the left to edit it here."
      />
    );
  }

  if (selected.kind === "project") {
    const p = projects.find((x) => x.id === selected.id);
    if (!p) return <Empty icon="alert-triangle" title="Project not found" />;
    return <ProjectEditor key={p.id} project={p} />;
  }

  if (selected.kind === "group") {
    for (const proj of projects) {
      const g = proj.groups.find((x) => x.id === selected.id);
      if (g)
        return <GroupEditor key={g.id} group={g} totalPanels={g.panels.length} />;
    }
    return <Empty icon="alert-triangle" title="System group not found" />;
  }

  const allPanels: Panel[] = [
    ...projects.flatMap((proj) => proj.groups.flatMap((g) => g.panels)),
    ...unassigned,
  ];

  if (selected.kind === "panel") {
    const p = allPanels.find((x) => x.id === selected.id);
    if (!p) return <Empty icon="alert-triangle" title="Panel not found" />;
    return <PanelEditor key={p.id} panel={p} />;
  }

  // cabinet
  const cab = allPanels.flatMap((p) => p.cabinets ?? []).find((c) => c.id === selected.id);
  if (!cab) return <Empty icon="alert-triangle" title="Cabinet not found" />;
  const parent = allPanels.find((p) => p.id === cab.panel_id);
  return <CabinetEditor key={cab.id} cabinet={cab} parentPanelTag={parent?.tag} />;
}

// ─── Project editor ─────────────────────────────────────────────────────────

function ProjectEditor({ project }: { project: ProjectNode }) {
  const mut = useUpdateProject();
  const archive = useArchiveProject();
  const [fields, setFields] = useState({
    name: project.name,
    code: project.code ?? "",
    customer: project.customer ?? "",
    site: project.site ?? "",
    description: project.description ?? "",
  });

  useEffect(() => {
    setFields({
      name: project.name,
      code: project.code ?? "",
      customer: project.customer ?? "",
      site: project.site ?? "",
      description: project.description ?? "",
    });
  }, [project.id, project.name, project.code, project.customer, project.site, project.description]);

  const save = (key: keyof typeof fields, current: string) => {
    const original = (project[key as keyof ProjectNode] as string | undefined) ?? "";
    if (current === original) return;
    mut.mutate({ id: project.id, body: { [key]: current || null } as never });
  };

  const totalGroups = project.groups.length;
  const totalPanels = project.groups.reduce((acc, g) => acc + g.panels.length, 0);

  return (
    <div>
      <Header
        kind="Project"
        title={project.name}
        sub={`${totalGroups} groups · ${totalPanels} panels`}
      />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Lifecycle status">
          <Select
            value={project.lifecycle_status}
            onChange={(e) => {
              const next = e.target.value as PanelStatus;
              if (next !== project.lifecycle_status)
                mut.mutate({ id: project.id, body: { lifecycle_status: next } });
            }}
          >
            {PANEL_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name">
          <Input
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
            onBlur={() => save("name", fields.name)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <Field label="Code">
          <Input
            value={fields.code}
            onChange={(e) => setFields((f) => ({ ...f, code: e.target.value }))}
            onBlur={() => save("code", fields.code)}
          />
        </Field>
        <Field label="Customer">
          <Input
            value={fields.customer}
            onChange={(e) => setFields((f) => ({ ...f, customer: e.target.value }))}
            onBlur={() => save("customer", fields.customer)}
          />
        </Field>
        <Field label="Site">
          <Input
            value={fields.site}
            onChange={(e) => setFields((f) => ({ ...f, site: e.target.value }))}
            onBlur={() => save("site", fields.site)}
          />
        </Field>
        <Field label="Description">
          <Input
            value={fields.description}
            onChange={(e) => setFields((f) => ({ ...f, description: e.target.value }))}
            onBlur={() => save("description", fields.description)}
          />
        </Field>
        <div style={{ paddingTop: 6 }}>
          <Btn
            variant="ghost"
            size="sm"
            icon="x"
            onClick={() => {
              if (window.confirm(`Archive project "${project.name}"?`))
                archive.mutate(project.id);
            }}
          >
            Archive project
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── System Group editor ────────────────────────────────────────────────────

function GroupEditor({ group, totalPanels }: { group: SystemGroup; totalPanels: number }) {
  const mut = useUpdateSystemGroup();
  const del = useDeleteSystemGroup();
  const [fields, setFields] = useState({
    name: group.name,
    code: group.code ?? "",
    description: group.description ?? "",
  });

  useEffect(() => {
    setFields({
      name: group.name,
      code: group.code ?? "",
      description: group.description ?? "",
    });
  }, [group.id, group.name, group.code, group.description]);

  return (
    <div>
      <Header
        kind={GROUP_TYPE_META[group.group_type].label + " system group"}
        title={group.name}
        sub={`${totalPanels} panel${totalPanels === 1 ? "" : "s"}`}
      />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Type">
          <Select
            value={group.group_type}
            onChange={(e) => {
              const next = e.target.value as GroupType;
              if (next !== group.group_type)
                mut.mutate({ id: group.id, body: { group_type: next } });
            }}
          >
            {GROUP_TYPE_OPTIONS.map(([value, m]) => (
              <option key={value} value={value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Lifecycle status">
          <Select
            value={group.lifecycle_status}
            onChange={(e) => {
              const next = e.target.value as PanelStatus;
              if (next !== group.lifecycle_status)
                mut.mutate({ id: group.id, body: { lifecycle_status: next } });
            }}
          >
            {PANEL_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name">
          <Input
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
            onBlur={() =>
              fields.name !== group.name &&
              mut.mutate({ id: group.id, body: { name: fields.name } })
            }
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <Field label="Code">
          <Input
            value={fields.code}
            onChange={(e) => setFields((f) => ({ ...f, code: e.target.value }))}
            onBlur={() =>
              fields.code !== (group.code ?? "") &&
              mut.mutate({ id: group.id, body: { code: fields.code || null } as never })
            }
          />
        </Field>
        <Field label="Description">
          <Input
            value={fields.description}
            onChange={(e) => setFields((f) => ({ ...f, description: e.target.value }))}
            onBlur={() =>
              fields.description !== (group.description ?? "") &&
              mut.mutate({
                id: group.id,
                body: { description: fields.description || null } as never,
              })
            }
          />
        </Field>
        <div style={{ paddingTop: 6 }}>
          <Btn
            variant="ghost"
            size="sm"
            icon="x"
            onClick={() => {
              if (
                window.confirm(
                  `Delete system group "${group.name}"? Panels under it will become unassigned.`,
                )
              )
                del.mutate(group.id);
            }}
          >
            Delete group
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Panel editor (no lifecycle status; QR shown) ───────────────────────────

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

// ─── Cabinet editor ─────────────────────────────────────────────────────────

function CabinetEditor({
  cabinet,
  parentPanelTag,
}: {
  cabinet: Cabinet;
  parentPanelTag?: string;
}) {
  const mut = useUpdateCabinet(cabinet.panel_id);
  const del = useDeleteCabinet(cabinet.panel_id);
  const [fields, setFields] = useState({
    name: cabinet.name,
    code: cabinet.code ?? "",
    notes: cabinet.notes ?? "",
  });

  useEffect(() => {
    setFields({
      name: cabinet.name,
      code: cabinet.code ?? "",
      notes: cabinet.notes ?? "",
    });
  }, [cabinet.id, cabinet.name, cabinet.code, cabinet.notes]);

  return (
    <div>
      <Header kind="Cabinet" title={cabinet.name} sub={cabinet.code} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Name">
          <Input
            value={fields.name}
            onChange={(e) => setFields((f) => ({ ...f, name: e.target.value }))}
            onBlur={() =>
              fields.name !== cabinet.name &&
              mut.mutate({ id: cabinet.id, body: { name: fields.name } })
            }
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        </Field>
        <Field label="Code">
          <Input
            value={fields.code}
            onChange={(e) => setFields((f) => ({ ...f, code: e.target.value }))}
            onBlur={() =>
              fields.code !== (cabinet.code ?? "") &&
              mut.mutate({ id: cabinet.id, body: { code: fields.code || null } as never })
            }
          />
        </Field>
        <Field label="Notes">
          <Input
            value={fields.notes}
            onChange={(e) => setFields((f) => ({ ...f, notes: e.target.value }))}
            onBlur={() =>
              fields.notes !== (cabinet.notes ?? "") &&
              mut.mutate({ id: cabinet.id, body: { notes: fields.notes || null } as never })
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
              if (window.confirm(`Delete cabinet "${cabinet.name}"?`)) del.mutate(cabinet.id);
            }}
          >
            Delete cabinet
          </Btn>
        </div>
      </div>
    </div>
  );
}
