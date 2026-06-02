"use client";

import { useState } from "react";
import { Card } from "@/components/primitives/card";
import { Toolbar } from "@/components/primitives/toolbar";
import { Btn } from "@/components/primitives/button";
import { Empty } from "@/components/primitives/empty";
import { Modal } from "@/components/primitives/modal";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Menu } from "@/components/primitives/menu";
import { Icon } from "@/components/icons/icon";
import {
  usePanelCabinets,
  useCreateCabinet,
  useUpdateCabinet,
  useDeleteCabinet,
} from "@/lib/query/hooks";
import type { Cabinet } from "@/lib/api/types";

interface EditState {
  id?: string;
  name: string;
  code: string;
  notes: string;
}

const BLANK: EditState = { name: "", code: "", notes: "" };

export function PanelCabinetsSection({ panelId }: { panelId: string }) {
  const { data: cabinets = [], isLoading } = usePanelCabinets(panelId);
  const create = useCreateCabinet(panelId);
  const update = useUpdateCabinet(panelId);
  const remove = useDeleteCabinet(panelId);

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<EditState>(BLANK);

  const openAdd = () => {
    setDraft(BLANK);
    setEditOpen(true);
  };
  const openEdit = (c: Cabinet) => {
    setDraft({ id: c.id, name: c.name, code: c.code ?? "", notes: c.notes ?? "" });
    setEditOpen(true);
  };

  const submit = async () => {
    if (!draft.name) return;
    if (draft.id) {
      await update.mutateAsync({
        id: draft.id,
        body: {
          name: draft.name,
          code: draft.code || null,
          notes: draft.notes || null,
        } as never,
      });
    } else {
      await create.mutateAsync({
        name: draft.name,
        code: draft.code || undefined,
        notes: draft.notes || undefined,
      });
    }
    setEditOpen(false);
  };

  const onDelete = (c: Cabinet) => {
    if (window.confirm(`Delete cabinet "${c.name}"?`)) remove.mutate(c.id);
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <Toolbar>
        <span className="card-title">Cabinets</span>
        <Btn size="sm" variant="primary" icon="plus" style={{ marginLeft: "auto" }} onClick={openAdd}>
          Add cabinet
        </Btn>
      </Toolbar>
      <Card style={{ overflow: "hidden" }}>
        {isLoading ? (
          <Empty icon="server" title="Loading cabinets…" />
        ) : cabinets.length === 0 ? (
          <Empty icon="box" title="No cabinets yet" sub="Add the physical cabinets of this panel." />
        ) : (
          <div>
            {cabinets.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--c-line)",
                }}
              >
                <Icon name="box" size={15} style={{ color: "var(--c-ink-3)", flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "var(--fz)", fontWeight: 600 }}>{c.name}</div>
                  {c.notes && (
                    <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>{c.notes}</div>
                  )}
                </div>
                {c.code && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: "var(--c-ink-3)",
                      background: "var(--c-surface-3)",
                      padding: "1px 6px",
                      borderRadius: 4,
                    }}
                  >
                    {c.code}
                  </span>
                )}
                <Menu
                  align="end"
                  trigger={<Btn icon="more-horizontal" variant="ghost" size="sm" />}
                  items={[
                    { label: "Edit", icon: "pencil", onClick: () => openEdit(c) },
                    { sep: true },
                    { label: "Delete", icon: "x", danger: true, onClick: () => onDelete(c) },
                  ]}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        title={draft.id ? "Edit cabinet" : "Add cabinet"}
        sub="A physical compartment inside this panel"
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
              placeholder="Incoming"
              autoFocus
            />
          </Field>
          <Field label="Code">
            <Input
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              placeholder="C1"
            />
          </Field>
          <Field label="Notes">
            <Input
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Optional"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
