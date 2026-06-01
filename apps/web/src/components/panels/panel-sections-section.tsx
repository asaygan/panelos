"use client";

import { useState } from "react";
import { Card } from "@/components/primitives/card";
import { Toolbar } from "@/components/primitives/toolbar";
import { Btn } from "@/components/primitives/button";
import { Empty } from "@/components/primitives/empty";
import { Modal } from "@/components/primitives/modal";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Select } from "@/components/primitives/select";
import { Menu } from "@/components/primitives/menu";
import { Icon } from "@/components/icons/icon";
import {
  usePanelSections,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
} from "@/lib/query/hooks";
import { SECTION_TYPE_META } from "@/lib/api/adapters";
import type { Section, SectionType } from "@/lib/api/types";

const TYPE_OPTIONS = Object.entries(SECTION_TYPE_META) as [SectionType, { label: string; icon: string }][];

interface EditState {
  id?: string;
  section_type: SectionType;
  name: string;
  description: string;
}

const BLANK: EditState = { section_type: "feeder", name: "", description: "" };

export function PanelSectionsSection({ panelId }: { panelId: string }) {
  const { data: sections = [], isLoading } = usePanelSections(panelId);
  const create = useCreateSection(panelId);
  const update = useUpdateSection(panelId);
  const remove = useDeleteSection(panelId);

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<EditState>(BLANK);

  const openAdd = () => {
    setDraft(BLANK);
    setEditOpen(true);
  };
  const openEdit = (s: Section) => {
    setDraft({ id: s.id, section_type: s.section_type, name: s.name, description: s.description ?? "" });
    setEditOpen(true);
  };

  const submit = async () => {
    if (!draft.name) return;
    if (draft.id) {
      await update.mutateAsync({
        id: draft.id,
        body: { name: draft.name, section_type: draft.section_type, description: draft.description || undefined },
      });
    } else {
      await create.mutateAsync({
        name: draft.name,
        section_type: draft.section_type,
        description: draft.description || undefined,
      });
    }
    setEditOpen(false);
  };

  const onDelete = (s: Section) => {
    if (window.confirm(`Delete section "${s.name}"?`)) remove.mutate(s.id);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <Toolbar>
        <span className="card-title">Sections</span>
        <Btn size="sm" variant="primary" icon="plus" style={{ marginLeft: "auto" }} onClick={openAdd}>
          Add section
        </Btn>
      </Toolbar>

      <Card style={{ overflow: "hidden" }}>
        {isLoading ? (
          <Empty icon="server" title="Loading sections…" />
        ) : sections.length === 0 ? (
          <Empty icon="layout-grid" title="No sections yet" sub="Add the functional sections of this panel." />
        ) : (
          <div>
            {sections.map((s) => {
              const meta = SECTION_TYPE_META[s.section_type];
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--c-line)",
                  }}
                >
                  <Icon name={meta.icon} size={15} style={{ color: "var(--c-ink-3)", flex: "none" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--fz)", fontWeight: 600 }}>{s.name}</div>
                    {s.description && (
                      <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{s.description}</div>
                    )}
                  </div>
                  <span
                    className="mono"
                    style={{ fontSize: 10, color: "var(--c-ink-3)", background: "var(--c-surface-3)", padding: "1px 6px", borderRadius: 4 }}
                  >
                    {meta.label}
                  </span>
                  <Menu
                    align="end"
                    trigger={<Btn icon="more-horizontal" variant="ghost" size="sm" />}
                    items={[
                      { label: "Edit", icon: "pencil", onClick: () => openEdit(s) },
                      { sep: true },
                      { label: "Delete", icon: "x", danger: true, onClick: () => onDelete(s) },
                    ]}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title={draft.id ? "Edit section" : "Add section"}
        sub="A functional part of this panel"
        width={440}
        footer={
          <>
            <Btn onClick={() => setEditOpen(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              icon={draft.id ? "check" : "plus"}
              disabled={!draft.name || create.isPending || update.isPending}
              onClick={submit}
            >
              {draft.id ? "Save" : "Add"}
            </Btn>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Name">
            <Input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="VFD Section"
              autoFocus
            />
          </Field>
          <Field label="Type">
            <Select
              value={draft.section_type}
              onChange={(e) => setDraft((d) => ({ ...d, section_type: e.target.value as SectionType }))}
            >
              {TYPE_OPTIONS.map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description">
            <Input
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Optional"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
