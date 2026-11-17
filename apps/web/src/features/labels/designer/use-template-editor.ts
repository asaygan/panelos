"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/components/ui/confirm";
import { useLabelTemplateMutations, useLabelTemplates } from "@/data/hooks";
import type { LabelTemplate } from "@/data/types";
import {
  blankLayout,
  defaultEngravedLayout,
  defaultPrintLayout,
  type ElementType,
  type LabelElement,
  type LabelLayout,
} from "@/lib/api/label-layout";
import { useApiError } from "@/lib/use-api-error";
import { conceptOf, layoutFromTemplate, sizeKey } from "../label-utils";
import {
  copyElement,
  createElement,
  editorReducer,
  initialState,
  moveZ,
  removeElement,
  replaceElement,
  type EditorState,
} from "./editor-state";

export type StartKind = "blank-engraved" | "blank-plain" | "sample-engraved" | "sample-print" | "copy";

export interface TemplateEditor {
  templates: LabelTemplate[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  state: EditorState;
  nameError: string | null;
  saving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  selected: LabelElement | null;
  select: (id: string | null) => void;
  /** Layout edits. `key` merges rapid edits of the same field into one undo step. */
  patchLayout: (layout: LabelLayout, key?: string) => void;
  changeElement: (el: LabelElement, key?: string) => void;
  /** Used by the canvas while dragging. */
  beginDrag: () => void;
  dragElement: (el: LabelElement) => void;
  addElement: (kind: ElementType) => void;
  removeSelected: (id: string) => void;
  duplicateElement: (id: string) => void;
  reorder: (id: string, dir: "forward" | "back") => void;
  undo: () => void;
  redo: () => void;
  setName: (name: string) => void;
  setDefaultFlag: (value: boolean) => void;
  save: () => Promise<void>;
  openTemplate: (id: string) => Promise<void>;
  startNew: (opts: { name: string; kind: StartKind; copyFromId?: string }) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  makeDefault: (id: string) => Promise<void>;
}

/** All state and server operations of the template designer. */
export function useTemplateEditor(): TemplateEditor {
  const t = useTranslations("labels");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const confirm = useConfirm();
  const query = useLabelTemplates();
  const mutations = useLabelTemplateMutations();
  const templates = React.useMemo(() => query.data ?? [], [query.data]);
  const [state, dispatch] = React.useReducer(editorReducer, undefined, initialState);
  const [nameError, setNameError] = React.useState<string | null>(null);
  const initialized = React.useRef(false);

  const load = React.useCallback((tpl: LabelTemplate) => {
    setNameError(null);
    dispatch({
      type: "load",
      templateId: tpl.id,
      name: tpl.name,
      isDefault: tpl.is_default,
      layout: layoutFromTemplate(tpl),
    });
  }, []);

  // open the default template (or a fresh starter when the company has none) once
  React.useEffect(() => {
    if (initialized.current || !query.data) return;
    initialized.current = true;
    const first = query.data.find((x) => x.is_default) ?? query.data[0];
    if (first) load(first);
    else
      dispatch({
        type: "load",
        templateId: null,
        name: t("designer.newName"),
        isDefault: true,
        layout: defaultEngravedLayout(),
        dirty: true,
      });
  }, [query.data, load, t]);

  // keep the "default" flag in step with the server (set from the list, or by another user)
  React.useEffect(() => {
    if (state.dirty || !state.templateId) return;
    const current = templates.find((x) => x.id === state.templateId);
    if (current && current.is_default !== state.isDefault) {
      dispatch({ type: "syncDefault", value: current.is_default });
    }
  }, [templates, state.dirty, state.templateId, state.isDefault]);

  const discardOk = React.useCallback(async () => {
    if (!state.dirty) return true;
    return confirm({
      title: tc("states.unsavedTitle"),
      description: tc("states.unsavedBody"),
      confirmLabel: tc("states.unsavedDiscard"),
      cancelLabel: tc("states.unsavedKeep"),
      destructive: true,
    });
  }, [state.dirty, confirm, tc]);

  const patchLayout = (layout: LabelLayout, key?: string) =>
    dispatch({ type: "edit", layout, key, at: Date.now() });

  const selected = state.layout.elements.find((e) => e.id === state.selectedId) ?? null;

  const save = async () => {
    const name = state.name.trim();
    if (!name) {
      setNameError(t("designer.nameRequired"));
      return;
    }
    setNameError(null);
    const body = {
      name,
      concept: conceptOf(state.layout),
      size_mm: sizeKey(state.layout),
      orientation: state.layout.orientation,
      layout_json: state.layout as unknown as { [k: string]: unknown },
      is_default: state.isDefault,
    };
    try {
      if (state.templateId) {
        await mutations.update.mutateAsync({ id: state.templateId, body });
        dispatch({ type: "saved", templateId: state.templateId });
      } else {
        const created = await mutations.create.mutateAsync(body);
        dispatch({ type: "saved", templateId: created.id });
      }
      toast.success(t("toast.templateSaved"));
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const startFrom = (kind: StartKind, copyFromId?: string): LabelLayout => {
    if (kind === "blank-engraved") return blankLayout("engraved");
    if (kind === "blank-plain") return blankLayout("plain");
    if (kind === "sample-print") return defaultPrintLayout();
    if (kind === "copy") {
      const src = templates.find((x) => x.id === copyFromId);
      if (src) return layoutFromTemplate(src);
    }
    return defaultEngravedLayout();
  };

  const startNew: TemplateEditor["startNew"] = async ({ name, kind, copyFromId }) => {
    if (!(await discardOk())) return;
    setNameError(null);
    dispatch({
      type: "load",
      templateId: null,
      name,
      isDefault: false,
      layout: startFrom(kind, copyFromId),
      dirty: true,
    });
  };

  return {
    templates,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
    state,
    nameError,
    saving: mutations.create.isPending || mutations.update.isPending,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    selected,
    select: (id) => dispatch({ type: "select", id }),
    patchLayout,
    changeElement: (el, key) => patchLayout(replaceElement(state.layout, el), key),
    beginDrag: () => dispatch({ type: "begin" }),
    dragElement: (el) => dispatch({ type: "live", layout: replaceElement(state.layout, el) }),
    addElement: (kind) => {
      const r = createElement(state.layout, kind);
      dispatch({ type: "edit", layout: r.layout, at: Date.now(), select: r.id });
    },
    removeSelected: (id) =>
      dispatch({ type: "edit", layout: removeElement(state.layout, id), at: Date.now(), select: null }),
    duplicateElement: (id) => {
      const r = copyElement(state.layout, id);
      if (r) dispatch({ type: "edit", layout: r.layout, at: Date.now(), select: r.id });
    },
    reorder: (id, dir) => patchLayout(moveZ(state.layout, id, dir)),
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    setName: (name) => {
      setNameError(null);
      dispatch({ type: "name", name });
    },
    setDefaultFlag: (value) => dispatch({ type: "default", value }),
    save,
    openTemplate: async (id) => {
      if (id === state.templateId) return;
      const tpl = templates.find((x) => x.id === id);
      if (!tpl || !(await discardOk())) return;
      load(tpl);
    },
    startNew,
    duplicateTemplate: async (id) => {
      const src = templates.find((x) => x.id === id);
      if (!src) return;
      await startNew({ name: t("designer.copyName", { name: src.name }), kind: "copy", copyFromId: id });
    },
    deleteTemplate: async (id) => {
      const tpl = templates.find((x) => x.id === id);
      if (!tpl) return;
      const ok = await confirm({
        title: t("delete.title", { name: tpl.name }),
        description: t("delete.body"),
        confirmLabel: tc("actions.delete"),
        cancelLabel: tc("actions.cancel"),
        destructive: true,
      });
      if (!ok) return;
      try {
        await mutations.remove.mutateAsync(id);
        toast.success(t("toast.templateDeleted"));
        if (state.templateId === id) {
          const next = templates.find((x) => x.id !== id && x.is_default) ?? templates.find((x) => x.id !== id);
          if (next) load(next);
          else
            dispatch({
              type: "load",
              templateId: null,
              name: t("designer.newName"),
              isDefault: true,
              layout: defaultEngravedLayout(),
              dirty: true,
            });
        }
      } catch (e) {
        toast.error(errorText(e));
      }
    },
    makeDefault: async (id) => {
      try {
        await mutations.setDefault.mutateAsync(id);
        toast.success(t("toast.defaultSet"));
      } catch (e) {
        toast.error(errorText(e));
      }
    },
  };
}
