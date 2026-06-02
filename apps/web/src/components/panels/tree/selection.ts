"use client";

import { useCallback, useMemo, useState } from "react";

/** Tree node kinds (drives the right detail-panel renderer + drag rules). */
export type NodeKind = "project" | "group" | "panel" | "cabinet";

export interface NodeRef {
  kind: NodeKind;
  id: string;
}

export function nodeKey(ref: NodeRef): string {
  return `${ref.kind}:${ref.id}`;
}

/** Selection state — single-select for MVP, multi-select arch is in place. */
export interface SelectionApi {
  selected: NodeRef | null;
  multi: ReadonlySet<string>;
  isSelected: (ref: NodeRef) => boolean;
  select: (ref: NodeRef | null) => void;
  toggleMulti: (ref: NodeRef) => void;
  clearMulti: () => void;
}

export function useSelection(): SelectionApi {
  const [selected, setSelected] = useState<NodeRef | null>(null);
  const [multi, setMulti] = useState<ReadonlySet<string>>(new Set());

  const isSelected = useCallback(
    (ref: NodeRef) =>
      (selected?.kind === ref.kind && selected.id === ref.id) || multi.has(nodeKey(ref)),
    [selected, multi],
  );
  const select = useCallback((ref: NodeRef | null) => setSelected(ref), []);
  const toggleMulti = useCallback((ref: NodeRef) => {
    setMulti((m) => {
      const next = new Set(m);
      const k = nodeKey(ref);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);
  const clearMulti = useCallback(() => setMulti(new Set()), []);

  return useMemo(
    () => ({ selected, multi, isSelected, select, toggleMulti, clearMulti }),
    [selected, multi, isSelected, select, toggleMulti, clearMulti],
  );
}
