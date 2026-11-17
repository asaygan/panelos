"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useTreeMutations } from "@/data/hooks";
import type { Project } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { LocationSelect } from "./node-forms";
import { nn, projectSchema, type ProjectValues } from "./schemas";

const FORM_ID = "new-project-form";

function Inner({ onOpenChange, onCreated }: { onOpenChange: (o: boolean) => void; onCreated?: (p: Project) => void }) {
  const t = useTranslations("panels.newProject");
  const tv = useTranslations("panels.validation");
  const tc = useTranslations("common");
  const tf = useTranslations("common.fields");
  const tp = useTranslations("panels.fields");
  const errorText = useApiError();
  const { createProject } = useTreeMutations();
  const schema = React.useMemo(() => projectSchema({ required: tv("required"), tooLong: tv("tooLong") }), [tv]);
  const form = useForm<ProjectValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", code: "", customer: "", site: "", description: "", location_id: "", lifecycle_status: "draft" },
  });
  const e = form.formState.errors;

  const submit = form.handleSubmit(async (v) => {
    try {
      const project = await createProject.mutateAsync({
        name: v.name,
        code: nn(v.code),
        customer: nn(v.customer),
        site: nn(v.site),
        description: nn(v.description),
        location_id: v.location_id || null,
        lifecycle_status: v.lifecycle_status,
      });
      toast.success(t("created"));
      onOpenChange(false);
      onCreated?.(project);
    } catch (err) {
      toast.error(errorText(err));
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !createProject.isPending && onOpenChange(o)}>
      <DialogContent
        title={t("title")}
        description={t("description")}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc("actions.cancel")}</Button>
            <Button type="submit" form={FORM_ID} variant="primary" loading={createProject.isPending}>{tc("actions.create")}</Button>
          </>
        }
      >
        <form id={FORM_ID} onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
          <Field label={tf("name")} required error={e.name?.message} className="sm:col-span-2">
            <Input {...form.register("name")} autoFocus />
          </Field>
          <Field label={tf("code")} error={e.code?.message}>
            <Input {...form.register("code")} className="font-mono" />
          </Field>
          <Field label={tf("customer")} error={e.customer?.message}>
            <Input {...form.register("customer")} />
          </Field>
          <Field label={tp("site")} error={e.site?.message}>
            <Input {...form.register("site")} />
          </Field>
          <Field label={tf("location")}>
            <Controller name="location_id" control={form.control} render={({ field }) => <LocationSelect value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label={tf("description")} error={e.description?.message} className="sm:col-span-2">
            <Textarea {...form.register("description")} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** "Yeni proje": name required, everything else optional. */
export function NewProjectDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; onCreated?: (p: Project) => void }) {
  return props.open ? <Inner onOpenChange={props.onOpenChange} onCreated={props.onCreated} /> : null;
}
