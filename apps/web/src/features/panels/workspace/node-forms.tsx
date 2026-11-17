"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import { useCabinetMutations, useLocations, useTreeMutations } from "@/data/hooks";
import type { Cabinet, GroupNode, ProjectNode } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { FormFrame } from "./form-frame";
import {
  GROUP_TYPES,
  LIFECYCLES,
  NONE,
  cabinetSchema,
  groupSchema,
  nn,
  projectSchema,
  type CabinetValues,
  type GroupValues,
  type ProjectValues,
} from "./schemas";

interface FormProps {
  canEdit: boolean;
  onDirtyChange: (dirty: boolean) => void;
}

function useMessages() {
  const t = useTranslations("panels.validation");
  return React.useMemo(() => ({ required: t("required"), tooLong: t("tooLong") }), [t]);
}

export function LifecycleSelect({ value, onChange, disabled, id, ...aria }: { value: string; onChange: (v: string) => void; disabled?: boolean; id?: string }) {
  const t = useTranslations("common.lifecycle");
  return (
    <Select
      id={id}
      {...aria}
      disabled={disabled}
      value={value}
      onValueChange={onChange}
      options={LIFECYCLES.map((s) => ({ value: s, label: t(s) }))}
    />
  );
}

export function LocationSelect({ value, onChange, disabled, id, ...aria }: { value: string; onChange: (v: string) => void; disabled?: boolean; id?: string }) {
  const tc = useTranslations("common");
  const { data: locations = [] } = useLocations();
  return (
    <Select
      id={id}
      {...aria}
      disabled={disabled}
      value={value || NONE}
      onValueChange={(v) => onChange(v === NONE ? "" : v)}
      options={[{ value: NONE, label: tc("states.none") }, ...locations.map((l) => ({ value: l.id, label: `${l.name} (${l.code})` }))]}
    />
  );
}

export function ProjectForm({ node, canEdit, onDirtyChange }: FormProps & { node: ProjectNode }) {
  const tc = useTranslations("common");
  const tf = useTranslations("common.fields");
  const tp = useTranslations("panels.fields");
  const errorText = useApiError();
  const m = useMessages();
  const { updateProject } = useTreeMutations();
  const schema = React.useMemo(() => projectSchema(m), [m]);
  const form = useForm<ProjectValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: node.name,
      code: node.code ?? "",
      customer: node.customer ?? "",
      site: node.site ?? "",
      description: node.description ?? "",
      location_id: node.location_id ?? "",
      lifecycle_status: node.lifecycle_status,
    },
  });
  const { register, control, formState } = form;
  const e = formState.errors;

  return (
    <FormFrame
      form={form}
      onDirtyChange={onDirtyChange}
      saving={updateProject.isPending}
      onSubmit={async (v) => {
        try {
          await updateProject.mutateAsync({
            id: node.id,
            body: {
              name: v.name,
              code: nn(v.code),
              customer: nn(v.customer),
              site: nn(v.site),
              description: nn(v.description),
              location_id: v.location_id || null,
              lifecycle_status: v.lifecycle_status,
            },
          });
          toast.success(tc("states.saved"));
          form.reset(v);
        } catch (err) {
          toast.error(errorText(err));
        }
      }}
    >
      <Field label={tf("name")} required error={e.name?.message}>
        <Input {...register("name")} disabled={!canEdit} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label={tf("code")} error={e.code?.message}>
          <Input {...register("code")} disabled={!canEdit} className="font-mono" />
        </Field>
        <Field label={tf("status")}>
          <Controller name="lifecycle_status" control={control} render={({ field }) => <LifecycleSelect value={field.value} onChange={field.onChange} disabled={!canEdit} />} />
        </Field>
        <Field label={tf("customer")} error={e.customer?.message}>
          <Input {...register("customer")} disabled={!canEdit} />
        </Field>
        <Field label={tf("location")}>
          <Controller name="location_id" control={control} render={({ field }) => <LocationSelect value={field.value} onChange={field.onChange} disabled={!canEdit} />} />
        </Field>
      </div>
      <Field label={tp("site")} error={e.site?.message}>
        <Input {...register("site")} disabled={!canEdit} />
      </Field>
      <Field label={tf("description")} error={e.description?.message}>
        <Textarea {...register("description")} disabled={!canEdit} />
      </Field>
    </FormFrame>
  );
}

export function GroupForm({ node, canEdit, onDirtyChange }: FormProps & { node: GroupNode }) {
  const tc = useTranslations("common");
  const tf = useTranslations("common.fields");
  const tg = useTranslations("common.groupType");
  const errorText = useApiError();
  const m = useMessages();
  const { updateGroup } = useTreeMutations();
  const schema = React.useMemo(() => groupSchema(m), [m]);
  const form = useForm<GroupValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: node.name,
      code: node.code ?? "",
      group_type: node.group_type,
      lifecycle_status: node.lifecycle_status,
      description: node.description ?? "",
    },
  });
  const { register, control, formState } = form;
  const e = formState.errors;

  return (
    <FormFrame
      form={form}
      onDirtyChange={onDirtyChange}
      saving={updateGroup.isPending}
      onSubmit={async (v) => {
        try {
          await updateGroup.mutateAsync({
            id: node.id,
            body: {
              name: v.name,
              code: nn(v.code),
              group_type: v.group_type,
              lifecycle_status: v.lifecycle_status,
              description: nn(v.description),
            },
          });
          toast.success(tc("states.saved"));
          form.reset(v);
        } catch (err) {
          toast.error(errorText(err));
        }
      }}
    >
      <Field label={tf("name")} required error={e.name?.message}>
        <Input {...register("name")} disabled={!canEdit} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Field label={tf("code")} error={e.code?.message}>
          <Input {...register("code")} disabled={!canEdit} className="font-mono" />
        </Field>
        <Field label={tc("entities.systemGroup")}>
          <Controller
            name="group_type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!canEdit} options={GROUP_TYPES.map((g) => ({ value: g, label: tg(g) }))} />
            )}
          />
        </Field>
        <Field label={tf("status")} className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <Controller name="lifecycle_status" control={control} render={({ field }) => <LifecycleSelect value={field.value} onChange={field.onChange} disabled={!canEdit} />} />
        </Field>
      </div>
      <Field label={tf("description")} error={e.description?.message}>
        <Textarea {...register("description")} disabled={!canEdit} />
      </Field>
    </FormFrame>
  );
}

export function CabinetForm({ node, canEdit, onDirtyChange }: FormProps & { node: Cabinet }) {
  const tc = useTranslations("common");
  const tf = useTranslations("common.fields");
  const errorText = useApiError();
  const m = useMessages();
  const { update } = useCabinetMutations();
  const schema = React.useMemo(() => cabinetSchema(m), [m]);
  const form = useForm<CabinetValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: node.name, code: node.code ?? "", notes: node.notes ?? "" },
  });
  const e = form.formState.errors;

  return (
    <FormFrame
      form={form}
      onDirtyChange={onDirtyChange}
      saving={update.isPending}
      onSubmit={async (v) => {
        try {
          await update.mutateAsync({ id: node.id, body: { name: v.name, code: nn(v.code), notes: nn(v.notes) } });
          toast.success(tc("states.saved"));
          form.reset(v);
        } catch (err) {
          toast.error(errorText(err));
        }
      }}
    >
      <Field label={tf("name")} required error={e.name?.message}>
        <Input {...form.register("name")} disabled={!canEdit} />
      </Field>
      <Field label={tf("code")} error={e.code?.message}>
        <Input {...form.register("code")} disabled={!canEdit} className="font-mono" />
      </Field>
      <Field label={tf("notes")} error={e.notes?.message}>
        <Textarea {...form.register("notes")} disabled={!canEdit} />
      </Field>
    </FormFrame>
  );
}
