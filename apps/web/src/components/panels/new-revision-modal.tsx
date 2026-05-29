"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { useCreateRevision } from "@/lib/query/hooks";

export interface NewRevisionModalProps {
  panelId: string;
  panelTag?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (revisionId: string) => void;
}

export function NewRevisionModal({
  panelId,
  panelTag,
  open,
  onOpenChange,
  onCreated,
}: NewRevisionModalProps) {
  const create = useCreateRevision();
  const [summary, setSummary] = useState("");

  const submit = async () => {
    if (!summary.trim()) return;
    const rev = await create.mutateAsync({ panelId, change_summary: summary.trim() });
    setSummary("");
    onOpenChange(false);
    onCreated?.(rev.id);
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) setSummary("");
        onOpenChange(o);
      }}
      title="New revision"
      sub={panelTag ? `Draft for ${panelTag}` : "Create a draft revision"}
      width={480}
      footer={
        <>
          <Btn onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn
            variant="primary"
            icon="git-branch"
            disabled={!summary.trim() || create.isPending}
            onClick={submit}
          >
            {create.isPending ? "Creating…" : "Create draft"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {create.isError && (
          <div style={{ fontSize: 12, color: "var(--c-fault)" }}>
            Could not create the revision. You may not have permission.
          </div>
        )}
        <Field label="Change summary">
          <textarea
            className="input"
            autoFocus
            style={{ height: 96, padding: 8, resize: "none" }}
            placeholder="Describe what changes in this revision…"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </Field>
        <div style={{ fontSize: 11, color: "var(--c-ink-3)" }}>
          A new draft revision will be created. Attach schematics and components, then submit it for
          approval.
        </div>
      </div>
    </Modal>
  );
}
