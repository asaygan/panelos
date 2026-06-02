"use client";

import { Btn } from "@/components/primitives/button";
import { Icon } from "@/components/icons/icon";

export interface PendingMove {
  kind: "panel" | "section";
  /** What's moving (display name). */
  label: string;
  /** Where it lands (display name). */
  to: string;
  /** Apply the move (Confirm). */
  apply: () => void;
  /** Discard the pending move (Cancel). */
  cancel: () => void;
}

/** Persistent toast-style confirm shown after a successful drop. */
export function MoveConfirmBar({ pending }: { pending: PendingMove | null }) {
  if (!pending) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--c-surface)",
        border: "1px solid var(--c-line-strong)",
        borderRadius: "var(--r-md)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,.18)",
        zIndex: 1000,
        fontSize: 13,
      }}
    >
      <Icon name="git-branch" size={14} style={{ color: "var(--c-accent)" }} />
      <span>
        Move <strong>{pending.label}</strong> to{" "}
        <strong>{pending.to}</strong>?
      </span>
      <Btn size="sm" onClick={pending.cancel}>
        Cancel
      </Btn>
      <Btn size="sm" variant="primary" icon="check" onClick={pending.apply}>
        Confirm
      </Btn>
    </div>
  );
}
