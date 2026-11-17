"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authApi } from "@/data/api";
import { useApiError } from "@/lib/use-api-error";

function ResetForm() {
  const t = useTranslations("auth.reset");
  const tLogin = useTranslations("auth.login");
  const errorText = useApiError();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-base text-muted">{t("missingToken")}</p>
        <Button asChild variant="primary" size="lg">
          <Link href="/forgot-password">{t("requestNew")}</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <span className="grid size-11 place-items-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold">{t("doneTitle")}</h1>
        <p className="text-base text-muted">{t("doneBody")}</p>
        <Button asChild variant="primary" size="lg">
          <Link href="/login">{tLogin("submit")}</Link>
        </Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError(t("mismatch"));
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1.5 text-base text-muted">{t("subtitle")}</p>
      </div>
      <Field label={t("password")} hint={t("hint")}>
        <PasswordInput
          autoComplete="new-password"
          autoFocus
          required
          minLength={10}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 pr-10"
        />
      </Field>
      <Field label={t("confirm")} error={error}>
        <PasswordInput
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-11 pr-10"
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy}>
        {t("submit")}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetForm />
    </React.Suspense>
  );
}
