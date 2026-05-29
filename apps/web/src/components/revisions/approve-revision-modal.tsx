"use client";

import { useState } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Meta } from "@/components/primitives/meta";
import { Field } from "@/components/primitives/field";
import { useTransitionRevision } from "@/lib/query/hooks";
import type { RevisionRequest } from "@/lib/api/types";

export interface ApproveRevisionModalProps {
  req: RevisionRequest | null;
  onClose: () => void;
}

export function ApproveRevisionModal({ req, onClose }: ApproveRevisionModalProps) {
  const transition = useTransitionRevision();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!req) return null;

  const run = async (action: "approve" | "reject" | "submit") => {
    setError(null);
    try {
      await transition.mutateAsync({ id: req.id, action, note: note || undefined });
      setNote("");
      onClose();
    } catch {
      setError("Action failed — you may not have permission for this transition.");
    }
  };

  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Review revision ${req.from}→${req.rev}`}
      sub={`${req.panel} · ${req.tag}`}
      width={540}
      footer={
        <>
          <Btn variant="danger" disabled={transition.isPending} onClick={() => run("reject")}>
            {req.status === "draft" ? "Reject" : "Request changes"}
          </Btn>
          {req.status === "draft" && (
            <Btn disabled={transition.isPending} onClick={() => run("submit")}>
              Submit for review
            </Btn>
          )}
          <Btn variant="primary" icon="check" disabled={transition.isPending} onClick={() => run("approve")}>
            {transition.isPending ? "Working…" : "Approve & publish"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && <div style={{ fontSize: 12, color: "var(--c-fault)" }}>{error}</div>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Meta label="Submitted by" value={req.by} />
          <Meta label="Date" value={req.date} mono />
          <Meta label="Status" value={req.status} />
          <Meta label="New revision" value={req.rev} mono />
        </div>
        <div>
          <div className="label-cap" style={{ marginBottom: 5 }}>
            Change summary
          </div>
          <div
            style={{
              fontSize: "var(--fz-sm)",
              color: "var(--c-ink-2)",
              lineHeight: 1.55,
              padding: 11,
              background: "var(--c-surface-3)",
              borderRadius: "var(--r-sm)",
            }}
          >
            {req.note || "—"}
          </div>
        </div>
        <Field label="Approval note (optional)">
          <textarea
            className="input"
            style={{ height: 56, padding: 8, resize: "none" }}
            placeholder="Add a note for the audit trail…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
