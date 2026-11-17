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
import { Input } from "@/components/ui/input";
import { useLocationMutations } from "@/data/hooks";
import type { Location } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

/** Create (location = null) or edit a site. */
export function LocationDialog({
  open,
  onOpenChange,
  location,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location | null;
}) {
  const t = useTranslations("settings.locations.dialog");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const { create, update } = useLocationMutations();

  const schema = React.useMemo(
    () =>
      z.object({
        code: z.string().trim().min(1, t("errors.codeRequired")).max(20),
        name: z.string().trim().min(1, t("errors.nameRequired")).max(120),
        region: z.string().trim().max(120),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const { register, handleSubmit, reset, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { code: "", name: "", region: "" },
  });

  React.useEffect(() => {
    if (open) reset({ code: location?.code ?? "", name: location?.name ?? "", region: location?.region ?? "" });
  }, [open, location, reset]);

  const pending = create.isPending || update.isPending;
  const opts = {
    onSuccess: () => {
      toast.success(t(location ? "updated" : "created"));
      onOpenChange(false);
    },
    onError: (e: unknown) => toast.error(errorText(e)),
  };

  const submit = handleSubmit((v) => {
    const body = { code: v.code.trim(), name: v.name.trim(), region: v.region.trim() || null };
    if (location) update.mutate({ id: location.id, body }, opts);
    else create.mutate(body, opts);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t(location ? "editTitle" : "createTitle")}
        description={t("description")}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)} disabled={pending}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" form="location-form" variant="primary" loading={pending}>
              {tc("actions.save")}
            </Button>
          </>
        }
      >
        <form id="location-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field label={tc("fields.code")} error={formState.errors.code?.message} hint={t("codeHint")} required>
            <Input {...register("code")} autoFocus className="font-mono uppercase" maxLength={20} />
          </Field>
          <Field label={tc("fields.name")} error={formState.errors.name?.message} required>
            <Input {...register("name")} />
          </Field>
          <Field label={t("region")} hint={t("regionHint")}>
            <Input {...register("region")} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
