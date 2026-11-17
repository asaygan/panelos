"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { loginAction, type LoginState } from "@/lib/auth/server-actions";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("auth.login");
  const [state, action, pending] = React.useActionState<LoginState | undefined, FormData>(
    loginAction,
    undefined,
  );
  // Credentials are kept in state so the verification step can resubmit them.
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [dismissedMfa, setDismissedMfa] = React.useState(false);
  const mfaStep = Boolean(state?.mfaRequired) && !dismissedMfa;

  React.useEffect(() => {
    if (state?.mfaRequired) setDismissedMfa(false);
  }, [state]);

  const error = state?.error ? t(`errors.${state.error}`) : null;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">{mfaStep ? t("mfaTitle") : t("title")}</h1>
        <p className="mt-1.5 text-base text-muted">{mfaStep ? t("mfaSubtitle") : t("subtitle")}</p>
      </div>

      {mfaStep ? (
        <>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
          <Field label={t("mfaCode")}>
            <Input
              name="mfa_code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              className="h-11 text-center font-mono text-xl tracking-[0.3em]"
              maxLength={14}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label={t("email")}>
            <Input
              name="email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder={t("emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <Field label={t("password")}>
              <PasswordInput
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
              />
            </Field>
            <Link href="/forgot-password" className="self-end text-sm text-primary hover:underline">
              {t("forgot")}
            </Link>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="rounded border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {mfaStep ? t("mfaSubmit") : t("submit")}
      </Button>

      {mfaStep ? (
        <Button variant="link" onClick={() => setDismissedMfa(true)} className="self-center text-sm">
          {t("mfaBack")}
        </Button>
      ) : (
        <p className="text-center text-xs text-subtle">{t("inviteOnly")}</p>
      )}
    </form>
  );
}
