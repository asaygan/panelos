"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Label } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";

import { useMemberMutations } from "@/data/hooks";
import type { Role } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { LOCATION_RESTRICTED } from "./guards";
import { LocationChecklist } from "./location-checklist";
import { RoleChooser } from "./role-chooser";

export function InviteDialog({
  open,
  onOpenChange,
  actorRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actorRole: Role | null;
}) {
  const t = useTranslations("users.invite");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const { invite } = useMemberMutations();

  const schema = React.useMemo(
    () =>
      z.object({
        email: z.string().trim().min(1, t("errors.emailRequired")).email(t("errors.emailInvalid")),
        role: z.enum(["owner", "admin", "engineer", "technician", "viewer"]),
        location_ids: z.array(z.string()),
        message: z.string().max(500, t("errors.messageLong")),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const defaults: Values = { email: "", role: "engineer", location_ids: [], message: "" };
  const { register, control, handleSubmit, reset, watch, formState } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  React.useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const role = watch("role");

  const submit = handleSubmit((v) => {
    invite.mutate(
      {
        email: v.email.trim(),
        role: v.role,
        location_ids: LOCATION_RESTRICTED.includes(v.role) ? v.location_ids : [],
        message: v.message.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(t("sent", { email: v.email.trim() }));
          onOpenChange(false);
        },
        onError: (e) => toast.error(errorText(e)),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        title={t("title")}
        description={t("description")}
        closeLabel={tc("actions.close")}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)} disabled={invite.isPending}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" form="invite-form" variant="primary" loading={invite.isPending}>
              {t("submit")}
            </Button>
          </>
        }
      >
        <form id="invite-form" onSubmit={submit} noValidate className="flex flex-col gap-5">
          <Field label={tc("fields.email")} error={formState.errors.email?.message} required>
            <Input type="email" autoComplete="off" autoFocus {...register("email")} />
          </Field>

          <div className="flex flex-col gap-1.5">
            <Label>{tc("fields.role")}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <RoleChooser
                  name="invite-role"
                  value={field.value}
                  onChange={field.onChange}
                  disabledRoles={actorRole === "admin" ? ["owner"] : []}
                />
              )}
            />
          </div>

          {LOCATION_RESTRICTED.includes(role) && (
            <div className="flex flex-col gap-1.5">
              <Label>
                {t("locations")} <span className="font-normal text-subtle">({tc("states.optional")})</span>
              </Label>
              <Controller
                control={control}
                name="location_ids"
                render={({ field }) => <LocationChecklist value={field.value} onChange={field.onChange} />}
              />
            </div>
          )}

          <Field
            label={`${t("message")} (${tc("states.optional")})`}
            error={formState.errors.message?.message}
            hint={t("messageHint")}
          >
            <Textarea {...register("message")} maxLength={500} />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
