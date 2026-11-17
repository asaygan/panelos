"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Select } from "@/components/ui/controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { usePanelMutations, useTree } from "@/data/hooks";
import type { Panel } from "@/data/types";
import { cn } from "@/lib/utils/cn";
import { useApiError } from "@/lib/use-api-error";
import { LocationSelect } from "./workspace/node-forms";
import { NONE, nn, panelSchema, type PanelValues } from "./workspace/schemas";

export interface PanelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this panel; omit to create a new one. */
  panel?: Panel;
  /** Pre-filled parents when creating from a tree node. */
  defaults?: { system_group_id?: string | null; location_id?: string | null };
  onSaved?: (panel: Panel) => void;
}

const FORM_ID = "panel-form";
const iso = (d: string) => (d ? `${d}T00:00:00Z` : null);

function Inner({ onOpenChange, panel, defaults, onSaved }: Omit<PanelFormDialogProps, "open">) {
  const t = useTranslations("panels.form");
  const tv = useTranslations("panels.validation");
  const tc = useTranslations("common");
  const tf = useTranslations("common.fields");
  const confirm = useConfirm();
  const errorText = useApiError();
  const { data: tree } = useTree();
  const { create, update } = usePanelMutations();
  const editing = !!panel;
  const schema = React.useMemo(() => panelSchema({ required: tv("required"), tooLong: tv("tooLong") }, !editing), [tv, editing]);

  const groups = React.useMemo(
    () => (tree?.projects ?? []).filter((p) => !p.archived_at).flatMap((p) => (p.groups ?? []).map((g) => ({ group: g, project: p }))),
    [tree],
  );
  const initialGroup = panel?.system_group_id ?? defaults?.system_group_id ?? "";
  const initialProject = panel?.project_id ?? groups.find((g) => g.group.id === initialGroup)?.project.id ?? "";

  const hasTech = !!panel && [panel.area, panel.voltage, panel.current_a, panel.phase, panel.mfr, panel.customer, panel.enclosure, panel.ip_class, panel.installed_at, panel.notes].some(Boolean);
  const [techOpen, setTechOpen] = React.useState(hasTech);

  const form = useForm<PanelValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: panel?.name ?? "",
      tag: panel?.tag ?? "",
      serial: panel?.serial ?? "",
      project_id: initialProject,
      system_group_id: initialGroup,
      location_id: panel?.location_id ?? defaults?.location_id ?? "",
      area: panel?.area ?? "",
      voltage: panel?.voltage ?? "",
      current_a: panel?.current_a ?? "",
      phase: panel?.phase ?? "",
      mfr: panel?.mfr ?? "",
      customer: panel?.customer ?? "",
      enclosure: panel?.enclosure ?? "",
      ip_class: panel?.ip_class ?? "",
      installed_at: panel?.installed_at?.slice(0, 10) ?? "",
      notes: panel?.notes ?? "",
    },
  });
  const { register, control, watch, setValue, formState } = form;
  const e = formState.errors;
  const projectId = watch("project_id");
  const saving = create.isPending || update.isPending;

  // Tree may load after the dialog opens: derive the project once it is known.
  React.useEffect(() => {
    if (!form.getValues("project_id") && initialProject) setValue("project_id", initialProject);
  }, [initialProject, form, setValue]);

  const close = async (next: boolean) => {
    if (next || saving) return;
    if (formState.isDirty) {
      const ok = await confirm({
        title: tc("states.unsavedTitle"),
        description: tc("states.unsavedBody"),
        confirmLabel: tc("states.unsavedDiscard"),
        cancelLabel: tc("states.unsavedKeep"),
        destructive: true,
      });
      if (!ok) return;
    }
    onOpenChange(false);
  };

  const submit = form.handleSubmit(async (v) => {
    const groupId = v.system_group_id || null;
    try {
      let saved: Panel;
      if (panel) {
        saved = await update.mutateAsync({
          id: panel.id,
          body: {
            name: v.name,
            tag: v.tag,
            system_group_id: groupId,
            location_id: v.location_id || null,
            area: nn(v.area),
            voltage: nn(v.voltage),
            current_a: nn(v.current_a),
            phase: nn(v.phase),
            mfr: nn(v.mfr),
            customer: nn(v.customer),
            enclosure: nn(v.enclosure),
            ip_class: nn(v.ip_class),
            installed_at: iso(v.installed_at),
            notes: nn(v.notes),
          },
        });
      } else {
        const o = (s: string) => nn(s) ?? undefined;
        saved = await create.mutateAsync({
          name: v.name,
          tag: o(v.tag),
          serial: o(v.serial),
          system_group_id: groupId ?? undefined,
          location_id: v.location_id || undefined,
          area: o(v.area),
          voltage: o(v.voltage),
          current_a: o(v.current_a),
          phase: o(v.phase),
          mfr: o(v.mfr),
          customer: o(v.customer),
          enclosure: o(v.enclosure),
          ip_class: o(v.ip_class),
          installed_at: iso(v.installed_at) ?? undefined,
          notes: o(v.notes),
        });
      }
      toast.success(editing ? tc("states.saved") : t("created"));
      onOpenChange(false);
      onSaved?.(saved);
    } catch (err) {
      toast.error(errorText(err));
    }
  });

  const projectOptions = [
    { value: NONE, label: tc("states.none") },
    ...(tree?.projects ?? []).filter((p) => !p.archived_at).map((p) => ({ value: p.id, label: p.name })),
  ];
  const groupOptions = [
    { value: NONE, label: tc("states.none") },
    ...groups.filter((g) => g.project.id === projectId).map((g) => ({ value: g.group.id, label: g.group.name })),
  ];

  return (
    <Dialog open onOpenChange={close}>
      <DialogContent
        size="lg"
        title={editing ? t("editTitle") : t("createTitle")}
        description={editing ? t("editDescription") : t("createDescription")}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => void close(false)} disabled={saving}>{tc("actions.cancel")}</Button>
            <Button type="submit" form={FORM_ID} variant="primary" loading={saving}>
              {editing ? tc("actions.save") : tc("actions.create")}
            </Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label={tf("name")} required error={e.name?.message}>
            <Input {...register("name")} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tf("tag")} required={editing} error={e.tag?.message} hint={editing ? undefined : t("tagHint")}>
              <Input {...register("tag")} className="font-mono" />
            </Field>
            <Field label={tf("serial")} hint={editing ? t("serialLocked") : t("serialHint")} error={e.serial?.message}>
              <Input {...register("serial")} readOnly={editing} disabled={editing} className="font-mono" />
            </Field>
            <Field label={tf("project")}>
              <Controller
                name="project_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || NONE}
                    onValueChange={(v) => {
                      const id = v === NONE ? "" : v;
                      field.onChange(id);
                      setValue("system_group_id", "", { shouldDirty: true });
                      const loc = (tree?.projects ?? []).find((p) => p.id === id)?.location_id;
                      if (loc && !form.getValues("location_id")) setValue("location_id", loc, { shouldDirty: true });
                    }}
                    options={projectOptions}
                  />
                )}
              />
            </Field>
            <Field label={tf("group")} hint={projectId ? undefined : t("groupNeedsProject")}>
              <Controller
                name="system_group_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || NONE} disabled={!projectId} onValueChange={(v) => field.onChange(v === NONE ? "" : v)} options={groupOptions} />
                )}
              />
            </Field>
            <Field label={tf("location")} className="sm:col-span-2">
              <Controller name="location_id" control={control} render={({ field }) => <LocationSelect value={field.value} onChange={field.onChange} />} />
            </Field>
          </div>

          <div className="rounded-lg border border-border">
            <button
              type="button"
              aria-expanded={techOpen}
              aria-controls="panel-form-tech"
              onClick={() => setTechOpen((o) => !o)}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-base font-medium hover:bg-surface-2"
            >
              <ChevronRight className={cn("size-4 text-subtle transition-transform", techOpen && "rotate-90")} aria-hidden />
              {t("technical")}
              <span className="text-sm font-normal text-subtle">{t("technicalHint")}</span>
            </button>
            {techOpen && (
              <div id="panel-form-tech" className="grid gap-4 border-t border-border p-3 sm:grid-cols-2">
                <Field label={tf("area")} error={e.area?.message}><Input {...register("area")} /></Field>
                <Field label={tf("manufacturer")} error={e.mfr?.message}><Input {...register("mfr")} /></Field>
                <Field label={tf("voltage")} error={e.voltage?.message}><Input {...register("voltage")} placeholder="400 V" /></Field>
                <Field label={tf("current")} error={e.current_a?.message}><Input {...register("current_a")} placeholder="630 A" /></Field>
                <Field label={tf("phase")} error={e.phase?.message}><Input {...register("phase")} placeholder="3P+N" /></Field>
                <Field label={tf("ipClass")} error={e.ip_class?.message}><Input {...register("ip_class")} placeholder="IP54" /></Field>
                <Field label={tf("enclosure")} error={e.enclosure?.message}><Input {...register("enclosure")} /></Field>
                <Field label={tf("customer")} error={e.customer?.message}><Input {...register("customer")} /></Field>
                <Field label={tf("installedAt")}><Input type="date" {...register("installed_at")} /></Field>
                <Field label={tf("notes")} error={e.notes?.message} className="sm:col-span-2"><Textarea {...register("notes")} /></Field>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Create / edit a panel's identity and technical data. */
export function PanelFormDialog({ open, ...rest }: PanelFormDialogProps) {
  return open ? <Inner {...rest} /> : null;
}
