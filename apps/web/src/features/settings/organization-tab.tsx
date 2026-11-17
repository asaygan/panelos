"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/controls";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useUpdateCompany } from "@/data/hooks";
import type { Company } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { LogoField } from "./logo-field";
import { TIMEZONES } from "./timezones";
import { useBeforeUnload } from "./use-before-unload";

const STANDARDS = ["IEC 61439", "UL 508A"] as const;

function toValues(c: Company) {
  return {
    name: c.name,
    short_name: c.short_name ?? "",
    standards_profile: c.standards_profile ?? STANDARDS[0],
    default_locale: c.default_locale === "en" ? "en" : "tr",
    timezone: c.timezone,
  };
}

export function OrganizationTab({
  company,
  readOnly,
  onDirtyChange,
}: {
  company: Company;
  readOnly: boolean;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const t = useTranslations("settings.organization");
  const errorText = useApiError();
  const update = useUpdateCompany();

  const schema = React.useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("errors.nameRequired")).max(120),
        short_name: z.string().trim().max(12, t("errors.shortNameLong")),
        standards_profile: z.string().min(1),
        default_locale: z.enum(["tr", "en"]),
        timezone: z.string().min(1),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: toValues(company) as Values,
  });
  const { control, register, handleSubmit, reset, formState } = form;
  const { errors, isDirty } = formState;

  React.useEffect(() => onDirtyChange(isDirty), [isDirty, onDirtyChange]);
  React.useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  useBeforeUnload(isDirty);

  const timezones = React.useMemo(() => {
    const list: string[] = [...TIMEZONES];
    if (!list.includes(company.timezone)) list.push(company.timezone);
    return list.map((z) => ({ value: z, label: z.replace(/_/g, " ") }));
  }, [company.timezone]);

  const onSubmit = handleSubmit((v) => {
    update.mutate(
      {
        name: v.name.trim(),
        short_name: v.short_name.trim() || null,
        standards_profile: v.standards_profile,
        default_locale: v.default_locale,
        timezone: v.timezone,
      },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (e) => toast.error(errorText(e)),
      },
    );
  });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title={t("logo.title")} description={t("logo.description")} />
        <CardBody>
          <LogoField company={company} readOnly={readOnly} />
        </CardBody>
      </Card>

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <CardHeader title={t("details.title")} description={t("details.description")} />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field label={t("name")} error={errors.name?.message} required>
              <Input {...register("name")} disabled={readOnly} autoComplete="organization" />
            </Field>
            <Field label={t("shortName")} error={errors.short_name?.message} hint={t("shortNameHint")}>
              <Input {...register("short_name")} disabled={readOnly} maxLength={12} />
            </Field>
            <Field label={t("standards")} hint={t("standardsHint")}>
              <Controller
                control={control}
                name="standards_profile"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readOnly}
                    options={[
                      ...STANDARDS.map((s) => ({ value: s, label: s })),
                      ...(STANDARDS.includes(field.value as (typeof STANDARDS)[number])
                        ? []
                        : [{ value: field.value, label: field.value }]),
                    ]}
                  />
                )}
              />
            </Field>
            <Field label={t("locale")} hint={t("localeHint")}>
              <Controller
                control={control}
                name="default_locale"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readOnly}
                    options={[
                      { value: "tr", label: "Türkçe" },
                      { value: "en", label: "English" },
                    ]}
                  />
                )}
              />
            </Field>
            <Field label={t("timezone")} hint={t("timezoneHint")} className="sm:col-span-2">
              <Controller
                control={control}
                name="timezone"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readOnly}
                    options={timezones}
                  />
                )}
              />
            </Field>
          </CardBody>
          {!readOnly && isDirty && (
            <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-end">
              <span className="text-sm text-muted sm:mr-auto">{t("unsaved")}</span>
              <Button onClick={() => reset(toValues(company) as Values)} disabled={update.isPending}>
                {t("discard")}
              </Button>
              <Button type="submit" variant="primary" loading={update.isPending}>
                {t("save")}
              </Button>
            </div>
          )}
        </Card>
      </form>
    </div>
  );
}
