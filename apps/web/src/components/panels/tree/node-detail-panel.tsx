"use client";

import { useEffect, useMemo, useState } from "react";
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

// Sticky footer with Save / Discard. Shown only when dirty.
function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  if (!dirty) return null;
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        marginTop: "auto",
        padding: "10px 16px",
        background: "var(--c-surface-2)",
        borderTop: "1px solid var(--c-line)",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 11, color: "var(--c-ink-3)" }}>Unsaved changes</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <Btn size="sm" variant="ghost" onClick={onDiscard} disabled={saving}>
          Discard
        </Btn>
        <Btn size="sm" variant="primary" icon="check" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Btn>
      </div>
    </div>
  );
}

// Generic dirty-buffer hook: snapshot original, track buffer, diff on save.
function useDraft<T extends Record<string, string | null | undefined>>(original: T, deps: unknown[]) {
  const [buf, setBuf] = useState<T>(original);
  // Reset whenever upstream changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setBuf(original), deps);
  const dirty = useMemo(() => {
    for (const k of Object.keys(original) as (keyof T)[]) {
      if ((buf[k] ?? "") !== (original[k] ?? "")) return true;
    }
    return false;
  }, [buf, original]);
  const diff = () => {
    const out: Partial<T> = {};
    for (const k of Object.keys(original) as (keyof T)[]) {
      if ((buf[k] ?? "") !== (original[k] ?? "")) out[k] = buf[k];
    }
    return out;
  };
  return { buf, setBuf, dirty, diff, reset: () => setBuf(original) };
}

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

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>{children}</div>
);

// ─── Project editor ─────────────────────────────────────────────────────────

function ProjectEditor({ project }: { project: ProjectNode }) {
  const mut = useUpdateProject();
  const archive = useArchiveProject();
  const original = {
    name: project.name,
    code: project.code ?? "",
    customer: project.customer ?? "",
    site: project.site ?? "",
    description: project.description ?? "",
  };
  const { buf, setBuf, dirty, diff, reset } = useDraft(original, [
    project.id,
    project.name,
    project.code,
    project.customer,
    project.site,
    project.description,
  ]);

  const onSave = () => {
    const d = diff();
    const body: Record<string, string | null> = {};
    for (const k of Object.keys(d) as (keyof typeof original)[]) {
      body[k] = (d[k] as string) || null;
    }
    mut.mutate({ id: project.id, body: body as never });
  };

  const totalGroups = project.groups.length;
  const totalPanels = project.groups.reduce((acc, g) => acc + g.panels.length, 0);

  return (
    <Frame>
      <Header
        kind="Project"
        title={project.name}
        sub={`${totalGroups} groups · ${totalPanels} panels`}
      />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
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
          <Input value={buf.name} onChange={(e) => setBuf({ ...buf, name: e.target.value })} />
        </Field>
        <Field label="Code">
          <Input value={buf.code} onChange={(e) => setBuf({ ...buf, code: e.target.value })} />
        </Field>
        <Field label="Customer">
          <Input
            value={buf.customer}
            onChange={(e) => setBuf({ ...buf, customer: e.target.value })}
          />
        </Field>
        <Field label="Site">
          <Input value={buf.site} onChange={(e) => setBuf({ ...buf, site: e.target.value })} />
        </Field>
        <Field label="Description">
          <Input
            value={buf.description}
            onChange={(e) => setBuf({ ...buf, description: e.target.value })}
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
      <SaveBar dirty={dirty} saving={mut.isPending} onSave={onSave} onDiscard={reset} />
    </Frame>
  );
}

// ─── System Group editor ────────────────────────────────────────────────────

function GroupEditor({ group, totalPanels }: { group: SystemGroup; totalPanels: number }) {
  const mut = useUpdateSystemGroup();
  const del = useDeleteSystemGroup();
  const original = {
    name: group.name,
    code: group.code ?? "",
    description: group.description ?? "",
  };
  const { buf, setBuf, dirty, diff, reset } = useDraft(original, [
    group.id,
    group.name,
    group.code,
    group.description,
  ]);

  const onSave = () => {
    const d = diff();
    const body: Record<string, string | null> = {};
    for (const k of Object.keys(d) as (keyof typeof original)[]) {
      body[k] = (d[k] as string) || null;
    }
    mut.mutate({ id: group.id, body: body as never });
  };

  return (
    <Frame>
      <Header
        kind={GROUP_TYPE_META[group.group_type].label + " system group"}
        title={group.name}
        sub={`${totalPanels} panel${totalPanels === 1 ? "" : "s"}`}
      />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
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
          <Input value={buf.name} onChange={(e) => setBuf({ ...buf, name: e.target.value })} />
        </Field>
        <Field label="Code">
          <Input value={buf.code} onChange={(e) => setBuf({ ...buf, code: e.target.value })} />
        </Field>
        <Field label="Description">
          <Input
            value={buf.description}
            onChange={(e) => setBuf({ ...buf, description: e.target.value })}
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
      <SaveBar dirty={dirty} saving={mut.isPending} onSave={onSave} onDiscard={reset} />
    </Frame>
  );
}

// ─── Panel editor (no lifecycle status; QR shown) ───────────────────────────

function PanelEditor({ panel }: { panel: Panel }) {
  const mut = useUpdatePanel();
  const original = {
    tag: panel.tag,
    name: panel.name,
    serial: panel.serial,
    voltage: panel.volt ?? "",
    current_a: panel.amp ?? "",
    ip_class: panel.enclosure ?? "",
    customer: panel.customer ?? "",
  };
  const { buf, setBuf, dirty, diff, reset } = useDraft(original, [
    panel.id,
    panel.tag,
    panel.name,
    panel.serial,
    panel.volt,
    panel.amp,
    panel.enclosure,
    panel.customer,
  ]);

  const onSave = () => {
    const d = diff();
    const body: Record<string, string | null> = {};
    for (const k of Object.keys(d) as (keyof typeof original)[]) {
      body[k] = (d[k] as string) || null;
    }
    mut.mutate({ id: panel.id, body: body as never });
  };

  return (
    <Frame>
      <Header kind="Panel" title={panel.tag} sub={panel.name} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <Field label="Tag">
          <Input value={buf.tag} onChange={(e) => setBuf({ ...buf, tag: e.target.value })} />
        </Field>
        <Field label="Name">
          <Input value={buf.name} onChange={(e) => setBuf({ ...buf, name: e.target.value })} />
        </Field>
        <Field label="Serial">
          <Input value={buf.serial} onChange={(e) => setBuf({ ...buf, serial: e.target.value })} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Voltage">
            <Input
              value={buf.voltage}
              onChange={(e) => setBuf({ ...buf, voltage: e.target.value })}
            />
          </Field>
          <Field label="Current">
            <Input
              value={buf.current_a}
              onChange={(e) => setBuf({ ...buf, current_a: e.target.value })}
            />
          </Field>
        </div>
        <Field label="IP / enclosure">
          <Input
            value={buf.ip_class}
            onChange={(e) => setBuf({ ...buf, ip_class: e.target.value })}
          />
        </Field>
        <Field label="Customer">
          <Input
            value={buf.customer}
            onChange={(e) => setBuf({ ...buf, customer: e.target.value })}
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
      <SaveBar dirty={dirty} saving={mut.isPending} onSave={onSave} onDiscard={reset} />
    </Frame>
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
  const original = {
    name: cabinet.name,
    code: cabinet.code ?? "",
    notes: cabinet.notes ?? "",
  };
  const { buf, setBuf, dirty, diff, reset } = useDraft(original, [
    cabinet.id,
    cabinet.name,
    cabinet.code,
    cabinet.notes,
  ]);

  const onSave = () => {
    const d = diff();
    const body: Record<string, string | null> = {};
    for (const k of Object.keys(d) as (keyof typeof original)[]) {
      body[k] = (d[k] as string) || null;
    }
    mut.mutate({ id: cabinet.id, body: body as never });
  };

  return (
    <Frame>
      <Header kind="Cabinet" title={cabinet.name} sub={cabinet.code} />
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        <Field label="Name">
          <Input value={buf.name} onChange={(e) => setBuf({ ...buf, name: e.target.value })} />
        </Field>
        <Field label="Code">
          <Input value={buf.code} onChange={(e) => setBuf({ ...buf, code: e.target.value })} />
        </Field>
        <Field label="Notes">
          <Input value={buf.notes} onChange={(e) => setBuf({ ...buf, notes: e.target.value })} />
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
      <SaveBar dirty={dirty} saving={mut.isPending} onSave={onSave} onDiscard={reset} />
    </Frame>
  );
}
