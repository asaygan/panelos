"use client";

import * as React from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authApi } from "@/data/api";
import { useApiError } from "@/lib/use-api-error";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgot");
  const tLogin = useTranslations("auth.login");
  const errorText = useApiError();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <span className="grid size-11 place-items-center rounded-full bg-success-soft text-success">
          <MailCheck className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold">{t("sentTitle")}</h1>
        <p className="text-base text-muted">{t("sentBody", { email: email.trim() })}</p>
        <Button asChild variant="secondary" size="lg">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1.5 text-base text-muted">{t("subtitle")}</p>
      </div>
      <Field label={tLogin("email")} error={error}>
        <Input
          type="email"
          autoComplete="username"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={tLogin("emailPlaceholder")}
          className="h-11"
        />
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={busy}>
        {t("submit")}
      </Button>
      <Link href="/login" className="self-center text-sm text-primary hover:underline">
        {t("backToLogin")}
      </Link>
    </form>
  );
}
