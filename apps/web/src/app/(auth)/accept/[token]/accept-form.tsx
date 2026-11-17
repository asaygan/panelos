"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { acceptInviteAction, type AcceptInviteState } from "@/lib/auth/server-actions";

export function AcceptForm({ token }: { token: string }) {
  const t = useTranslations("auth.accept");
  const tReset = useTranslations("auth.reset");
  const [state, action, pending] = React.useActionState<AcceptInviteState | undefined, FormData>(
    acceptInviteAction,
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <Field label={t("name")}>
        <Input name="name" autoComplete="name" autoFocus className="h-11" />
      </Field>
      <Field label={t("password")} hint={tReset("hint")}>
        <PasswordInput name="password" autoComplete="new-password" minLength={10} required className="h-11 pr-10" />
      </Field>
      <Field label={t("confirm")}>
        <PasswordInput name="confirm" autoComplete="new-password" required className="h-11 pr-10" />
      </Field>
      {state?.error && (
        <p role="alert" className="rounded border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
