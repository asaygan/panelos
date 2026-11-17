"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useCabinetMutations } from "@/data/hooks";
import type { Cabinet } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

interface Values {
  name: string;
  code: string;
  notes: string;
}

export function CabinetDialog({
  open,
  onOpenChange,
  panelId,
  cabinet,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelId: string;
  cabinet?: Cabinet;
}) {
  const t = useTranslations("panelDetail.cabinets");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const { create, update } = useCabinetMutations();
  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("nameRequired")).max(120),
        code: z.string().trim().max(40),
        notes: z.string().trim().max(2000),
      }),
    [t],
  );
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: cabinet?.name ?? "",
      code: cabinet?.code ?? "",
      notes: cabinet?.notes ?? "",
    },
  });
  const pending = create.isPending || update.isPending;

  const submit = form.handleSubmit((v) => {
    const body = { name: v.name, code: v.code || null, notes: v.notes || null };
    const opts = {
      onSuccess: () => {
        toast.success(cabinet ? t("updated") : t("created"));
        onOpenChange(false);
      },
      onError: (e: unknown) => toast.error(errorText(e)),
    };
    if (cabinet) update.mutate({ id: cabinet.id, body }, opts);
    else create.mutate({ panelId, body }, opts);
  });

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title={cabinet ? t("editTitle") : t("addTitle")}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)}>{tc("actions.cancel")}</Button>
            <Button variant="primary" type="submit" form="cabinet-form" loading={pending}>
              {tc("actions.save")}
            </Button>
          </>
        }
      >
        <form id="cabinet-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field label={t("fieldName")} required error={errors.name?.message}>
            <Input autoFocus placeholder={t("namePlaceholder")} {...form.register("name")} />
          </Field>
          <Field label={t("fieldCode")} hint={tc("states.optional")} error={errors.code?.message}>
            <Input placeholder={t("codePlaceholder")} className="font-mono" {...form.register("code")} />
          </Field>
          <Field label={tc("fields.notes")} hint={tc("states.optional")} error={errors.notes?.message}>
            <Textarea {...form.register("notes")} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
