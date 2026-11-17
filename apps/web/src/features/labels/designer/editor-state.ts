import {
  blankLayout,
  makeElement,
  nextId,
  type ElementType,
  type LabelElement,
  type LabelLayout,
} from "@/lib/api/label-layout";

const HISTORY_LIMIT = 60;
/** Edits with the same key within this window collapse into one undo step (typing in a number field). */
const COALESCE_MS = 1000;

export interface EditorState {
  /** null = a template that has not been saved yet. */
  templateId: string | null;
  name: string;
  isDefault: boolean;
  layout: LabelLayout;
  selectedId: string | null;
  dirty: boolean;
  past: LabelLayout[];
  future: LabelLayout[];
  lastKey: string | null;
  lastAt: number;
}

export type EditorAction =
  | {
      type: "load";
      templateId: string | null;
      name: string;
      isDefault: boolean;
      layout: LabelLayout;
      dirty?: boolean;
    }
  | { type: "name"; name: string }
  | { type: "default"; value: boolean }
  /** Follow the server's default flag without marking the editor dirty. */
  | { type: "syncDefault"; value: boolean }
  /** A tracked edit (one undo step; same `key` within a second merges). */
  | { type: "edit"; layout: LabelLayout; at: number; key?: string; select?: string | null }
  /** Snapshot before a drag starts. */
  | { type: "begin" }
  /** Drag in progress: replaces the layout without adding history. */
  | { type: "live"; layout: LabelLayout }
  | { type: "select"; id: string | null }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "saved"; templateId: string };

export function initialState(): EditorState {
  return {
    templateId: null,
    name: "",
    isDefault: false,
    layout: blankLayout("engraved"),
    selectedId: null,
    dirty: false,
    past: [],
    future: [],
    lastKey: null,
    lastAt: 0,
  };
}

const push = (past: LabelLayout[], layout: LabelLayout) =>
  [...past, layout].slice(-HISTORY_LIMIT);

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "load":
      return {
        ...initialState(),
        templateId: action.templateId,
        name: action.name,
        isDefault: action.isDefault,
        layout: action.layout,
        dirty: action.dirty ?? false,
      };
    case "name":
      return { ...state, name: action.name, dirty: true };
    case "default":
      return { ...state, isDefault: action.value, dirty: true };
    case "syncDefault":
      return { ...state, isDefault: action.value };
    case "edit": {
      const merge = action.key !== undefined && action.key === state.lastKey && action.at - state.lastAt < COALESCE_MS;
      return {
        ...state,
        layout: action.layout,
        past: merge ? state.past : push(state.past, state.layout),
        future: [],
        dirty: true,
        lastKey: action.key ?? null,
        lastAt: action.at,
        selectedId: action.select !== undefined ? action.select : state.selectedId,
      };
    }
    case "begin":
      return { ...state, past: push(state.past, state.layout), future: [], lastKey: null };
    case "live":
      return { ...state, layout: action.layout, dirty: true };
    case "select":
      return { ...state, selectedId: action.id };
    case "undo": {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        ...state,
        layout: prev,
        past: state.past.slice(0, -1),
        future: [state.layout, ...state.future],
        selectedId: prev.elements.some((e) => e.id === state.selectedId) ? state.selectedId : null,
        dirty: true,
        lastKey: null,
      };
    }
    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        layout: next,
        past: push(state.past, state.layout),
        future: state.future.slice(1),
        selectedId: next.elements.some((e) => e.id === state.selectedId) ? state.selectedId : null,
        dirty: true,
        lastKey: null,
      };
    }
    case "saved":
      return { ...state, templateId: action.templateId, dirty: false };
  }
}

// ── pure layout operations ─────────────────────────────────────────────────────
export const maxZ = (layout: LabelLayout) => Math.max(0, ...layout.elements.map((e) => e.z));

export function replaceElement(layout: LabelLayout, el: LabelElement): LabelLayout {
  return { ...layout, elements: layout.elements.map((e) => (e.id === el.id ? el : e)) };
}

export function removeElement(layout: LabelLayout, id: string): LabelLayout {
  return { ...layout, elements: layout.elements.filter((e) => e.id !== id) };
}

export function copyElement(layout: LabelLayout, id: string): { layout: LabelLayout; id: string } | null {
  const el = layout.elements.find((e) => e.id === id);
  if (!el) return null;
  const copy: LabelElement = { ...el, id: nextId(), x: el.x + 2, y: el.y + 2, z: maxZ(layout) + 1 };
  return { layout: { ...layout, elements: [...layout.elements, copy] }, id: copy.id };
}

export function createElement(
  layout: LabelLayout,
  kind: ElementType,
): { layout: LabelLayout; id: string } {
  const { w, h } = layout.size_mm;
  const el = makeElement(kind, w / 2, h / 2, maxZ(layout) + 1, layout.background.kind === "engraved");
  return { layout: { ...layout, elements: [...layout.elements, el] }, id: el.id };
}

/** Swap z-order with the neighbouring element in the stacking order. */
export function moveZ(layout: LabelLayout, id: string, dir: "forward" | "back"): LabelLayout {
  const sorted = [...layout.elements].sort((a, b) => a.z - b.z);
  const idx = sorted.findIndex((e) => e.id === id);
  const swap = dir === "forward" ? idx + 1 : idx - 1;
  if (idx < 0 || swap < 0 || swap >= sorted.length) return layout;
  // re-rank by position so elements sharing a z value still swap
  const order = sorted.map((e) => e.id);
  [order[idx], order[swap]] = [order[swap]!, order[idx]!];
  return { ...layout, elements: layout.elements.map((e) => ({ ...e, z: order.indexOf(e.id) })) };
}
