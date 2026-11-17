import type { Cabinet, GroupNode, PanelNode, ProjectNode, Tree } from "@/data/types";

/** The node kinds a user can select / edit. */
export type NodeKind = "project" | "group" | "panel" | "cabinet";
export interface NodeRef {
  kind: NodeKind;
  id: string;
}

export const UNASSIGNED_KEY = "unassigned";
export const keyOf = (kind: NodeKind, id: string) => `${kind}:${id}`;
export const refKey = (r: NodeRef) => keyOf(r.kind, r.id);

/** Fold text for matching: Turkish-aware (İ/ı) lower casing. */
export const fold = (s: string | null | undefined) => (s ?? "").toLocaleLowerCase("tr");

export type IndexEntry =
  | { key: string; kind: "project"; parent: null; node: ProjectNode; text: string }
  | { key: string; kind: "group"; parent: string; node: GroupNode; project: ProjectNode; text: string }
  | { key: string; kind: "panel"; parent: string; node: PanelNode; text: string }
  | { key: string; kind: "cabinet"; parent: string; node: Cabinet; panel: PanelNode; text: string };

export interface TreeIndex {
  entries: Map<string, IndexEntry>;
  projects: ProjectNode[];
  unassigned: PanelNode[];
  /** Every group with its project, for "move to" lists. */
  groups: { group: GroupNode; project: ProjectNode }[];
  panelCount: number;
  /** Every project key (default expansion). */
  projectKeys: string[];
}

const panelText = (p: PanelNode) => fold(`${p.tag} ${p.name} ${p.serial} ${p.customer ?? ""}`);

/** One pass over the tree: lookup table + searchable text per node. */
export function buildIndex(tree: Tree | undefined): TreeIndex {
  const entries = new Map<string, IndexEntry>();
  const projects = (tree?.projects ?? []).filter((p) => !p.archived_at);
  const unassigned = (tree?.unassigned_panels ?? []).filter((p) => !p.archived_at);
  const groups: TreeIndex["groups"] = [];
  let panelCount = unassigned.length;

  const addPanel = (panel: PanelNode, parent: string) => {
    const key = keyOf("panel", panel.id);
    entries.set(key, { key, kind: "panel", parent, node: panel, text: panelText(panel) });
    for (const c of panel.cabinets ?? []) {
      const ck = keyOf("cabinet", c.id);
      entries.set(ck, {
        key: ck,
        kind: "cabinet",
        parent: key,
        node: c,
        panel,
        text: fold(`${c.name} ${c.code ?? ""}`),
      });
    }
  };

  for (const project of projects) {
    const pk = keyOf("project", project.id);
    entries.set(pk, {
      key: pk,
      kind: "project",
      parent: null,
      node: project,
      text: fold(`${project.name} ${project.code ?? ""} ${project.customer ?? ""} ${project.site ?? ""}`),
    });
    for (const group of project.groups ?? []) {
      const gk = keyOf("group", group.id);
      groups.push({ group, project });
      entries.set(gk, {
        key: gk,
        kind: "group",
        parent: pk,
        node: group,
        project,
        text: fold(`${group.name} ${group.code ?? ""}`),
      });
      for (const panel of group.panels ?? []) {
        if (panel.archived_at) continue;
        panelCount += 1;
        addPanel(panel, gk);
      }
    }
  }
  for (const panel of unassigned) addPanel(panel, UNASSIGNED_KEY);

  return {
    entries,
    projects,
    unassigned,
    groups,
    panelCount,
    projectKeys: projects.map((p) => keyOf("project", p.id)),
  };
}

/** Keys of every ancestor of `key` (nearest first). */
export function ancestorsOf(index: TreeIndex, key: string): string[] {
  const out: string[] = [];
  let cur = index.entries.get(key)?.parent ?? null;
  while (cur) {
    out.push(cur);
    cur = index.entries.get(cur)?.parent ?? null;
  }
  return out;
}

// ── Flattened rows ─────────────────────────────────────────────────────────
export type Row =
  | { type: "node"; key: string; level: number; entry: IndexEntry; expandable: boolean; expanded: boolean; posInSet: number; setSize: number; counts: { a: number; b: number } }
  | { type: "unassigned"; key: string; level: 1; expandable: true; expanded: boolean; count: number; posInSet: number; setSize: number }
  | { type: "add"; key: string; level: number; parentKey: string; addKind: "group" | "panel" | "cabinet"; hint: boolean; active: boolean };

export interface FlattenOptions {
  index: TreeIndex;
  expanded: ReadonlySet<string>;
  filter: string;
  canEdit: boolean;
  /** Parent key whose inline quick-add input is open. */
  adding: string | null;
}

/**
 * Visible rows in display order. With a filter: a node shows if it matches,
 * has a matching descendant, or sits under a match; ancestors of matches are
 * expanded automatically.
 */
export function flatten({ index, expanded, filter, canEdit, adding }: FlattenOptions): Row[] {
  const q = fold(filter.trim());
  const filtering = q.length > 0;
  const rows: Row[] = [];

  // Which nodes match / contain a match.
  const direct = new Set<string>();
  const hasMatchBelow = new Set<string>();
  if (filtering) {
    for (const e of index.entries.values()) {
      if (!e.text.includes(q)) continue;
      direct.add(e.key);
      let p = e.parent;
      while (p) {
        hasMatchBelow.add(p);
        p = index.entries.get(p)?.parent ?? null;
      }
    }
  }
  const isOpen = (key: string) => (filtering && hasMatchBelow.has(key)) || expanded.has(key);
  const underMatch = (key: string) => {
    let p = index.entries.get(key)?.parent ?? null;
    while (p) {
      if (direct.has(p)) return true;
      p = index.entries.get(p)?.parent ?? null;
    }
    return false;
  };
  const show = (key: string) => !filtering || direct.has(key) || hasMatchBelow.has(key) || underMatch(key);

  const pushPanels = (panels: PanelNode[], parentKey: string, level: number, openParent: boolean) => {
    if (!openParent) return;
    const list = panels.filter((p) => show(keyOf("panel", p.id)));
    list.forEach((panel, i) => {
      const key = keyOf("panel", panel.id);
      const entry = index.entries.get(key)!;
      const cabinets = (panel.cabinets ?? []).filter((c) => show(keyOf("cabinet", c.id)));
      rows.push({
        type: "node",
        key,
        level,
        entry,
        expandable: cabinets.length > 0,
        expanded: cabinets.length > 0 && isOpen(key),
        posInSet: i + 1,
        setSize: list.length,
        counts: { a: cabinets.length, b: 0 },
      });
      if (isOpen(key)) {
        cabinets.forEach((c, j) => {
          const ck = keyOf("cabinet", c.id);
          rows.push({
            type: "node",
            key: ck,
            level: level + 1,
            entry: index.entries.get(ck)!,
            expandable: false,
            expanded: false,
            posInSet: j + 1,
            setSize: cabinets.length,
            counts: { a: 0, b: 0 },
          });
        });
        if (canEdit && !filtering) {
          rows.push({ type: "add", key: `add:${key}`, level: level + 1, parentKey: key, addKind: "cabinet", hint: false, active: adding === key });
        }
      }
    });
    if (canEdit && !filtering) {
      rows.push({ type: "add", key: `add:${parentKey}`, level, parentKey, addKind: "panel", hint: list.length === 0, active: adding === parentKey });
    }
  };

  const projects = index.projects.filter((p) => show(keyOf("project", p.id)));
  projects.forEach((project, i) => {
    const pk = keyOf("project", project.id);
    const groups = (project.groups ?? []).filter((g) => show(keyOf("group", g.id)));
    const open = isOpen(pk);
    const panelTotal = (project.groups ?? []).reduce((n, g) => n + (g.panels ?? []).filter((p) => !p.archived_at).length, 0);
    rows.push({
      type: "node",
      key: pk,
      level: 1,
      entry: index.entries.get(pk)!,
      expandable: true,
      expanded: open,
      posInSet: i + 1,
      setSize: projects.length,
      counts: { a: (project.groups ?? []).length, b: panelTotal },
    });
    if (!open) return;
    groups.forEach((group, j) => {
      const gk = keyOf("group", group.id);
      const gOpen = isOpen(gk);
      const panels = (group.panels ?? []).filter((p) => !p.archived_at);
      rows.push({
        type: "node",
        key: gk,
        level: 2,
        entry: index.entries.get(gk)!,
        expandable: true,
        expanded: gOpen,
        posInSet: j + 1,
        setSize: groups.length,
        counts: { a: panels.length, b: 0 },
      });
      pushPanels(panels, gk, 3, gOpen);
    });
    if (canEdit && !filtering) {
      rows.push({ type: "add", key: `add:${pk}`, level: 2, parentKey: pk, addKind: "group", hint: groups.length === 0, active: adding === pk });
    }
  });

  const unassigned = index.unassigned;
  if (unassigned.length > 0 || (canEdit && !filtering)) {
    const visible = unassigned.filter((p) => show(keyOf("panel", p.id)));
    if (!filtering || visible.length > 0) {
      const open = isOpen(UNASSIGNED_KEY);
      rows.push({ type: "unassigned", key: UNASSIGNED_KEY, level: 1, expandable: true, expanded: open, count: unassigned.length, posInSet: projects.length + 1, setSize: projects.length + 1 });
      pushPanels(visible, UNASSIGNED_KEY, 2, open);
    }
  }
  return rows;
}

/** Which kinds of drag each drop target accepts. */
export type DragKind = "panel" | "cabinet";
export interface DragData {
  kind: DragKind;
  id: string;
  label: string;
  /** Current parent: group id (or null = unassigned) for panels, panel id for cabinets. */
  fromId: string | null;
}
export interface DropData {
  accepts: DragKind;
  /** Group id, panel id, or null for the Unassigned bucket. */
  targetId: string | null;
  label: string;
}

/** A drop (or "move to" choice) waiting for the user's confirmation. */
export interface PendingMove {
  kind: DragKind;
  id: string;
  label: string;
  /** Group id / panel id; null = Unassigned. */
  targetId: string | null;
  targetLabel: string;
}
