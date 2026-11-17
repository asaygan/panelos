"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/controls";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useBomMutations } from "@/data/hooks";
import type { BomItem } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

const schema = z.object({
  slot: z.string().trim().min(1, "required").max(60),
  ref: z.string().trim().min(1, "required").max(60),
  description: z.string().trim().min(1, "required").max(300),
  part_number: z.string().trim().max(100),
  rating: z.string().trim().max(60),
  type: z.string().trim().max(60),
  status: z.string().trim().min(1),
});
type Values = z.infer<typeof schema>;

const empty: Values = { slot: "", ref: "", description: "", part_number: "", rating: "", type: "", status: "ok" };

/** Add (no `item`) or edit a BOM row of a draft revision. */
export function BomFormDialog({
  revisionId,
  item,
  open,
  onOpenChange,
}: {
  revisionId: string;
  item?: BomItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("revisions.bom");
  const tc = useTranslations("common.actions");
  const errorText = useApiError();
  const { add, update } = useBomMutations(revisionId);
  const pending = add.isPending || update.isPending;

  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: empty });
  const { register, handleSubmit, reset, setValue, watch, formState } = form;
  const errors = formState.errors;
  const err = (k: keyof Values) => (errors[k] ? t("required") : null);

  React.useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            slot: item.slot,
            ref: item.ref,
            description: item.description,
            part_number: item.part_number ?? "",
            rating: item.rating ?? "",
            type: item.type ?? "",
            status: item.status || "ok",
          }
        : empty,
    );
  }, [open, item, reset]);

  const onSubmit = handleSubmit((v) => {
    const body = {
      ...v,
      part_number: v.part_number || null,
      rating: v.rating || null,
      type: v.type || null,
    };
    const opts = {
      onSuccess: () => {
        toast.success(t(item ? "updated" : "added"));
        onOpenChange(false);
      },
      onError: (e: unknown) => toast.error(errorText(e)),
    };
    if (item) update.mutate({ id: item.id, body }, opts);
    else add.mutate(body, opts);
  });

  const statusValue = watch("status");
  const statusOptions = [
    { value: "ok", label: t("statusOk") },
    { value: "warn", label: t("statusWarn") },
  ];
  if (!statusOptions.some((o) => o.value === statusValue))
    statusOptions.push({ value: statusValue, label: statusValue });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent
        title={item ? t("editTitle") : t("addTitle")}
        closeLabel={tc("close")}
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
              {tc("cancel")}
            </Button>
            <Button type="submit" form="bom-form" variant="primary" loading={pending}>
              {tc("save")}
            </Button>
          </>
        }
      >
        <form id="bom-form" onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2">
          <Field label={t("slot")} required error={err("slot")}>
            <Input {...register("slot")} />
          </Field>
          <Field label={t("ref")} required error={err("ref")}>
            <Input {...register("ref")} />
          </Field>
          <Field label={t("description")} required error={err("description")} className="sm:col-span-2">
            <Input {...register("description")} />
          </Field>
          <Field label={t("partNumber")}>
            <Input {...register("part_number")} />
          </Field>
          <Field label={t("rating")}>
            <Input {...register("rating")} />
          </Field>
          <Field label={t("type")}>
            <Input {...register("type")} />
          </Field>
          <Field label={t("status")}>
            <Select
              value={statusValue}
              onValueChange={(v) => setValue("status", v, { shouldDirty: true })}
              options={statusOptions}
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
