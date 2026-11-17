"use client";

import * as React from "react";
import { Copy, ShieldCheck, ShieldOff } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PasswordInput } from "@/components/auth/password-input";
import { QrCode } from "@/components/domain/qr-code";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";
import { authApi } from "@/data/api";
import { qk } from "@/data/hooks";
import type { Me } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

export function SecuritySettings({ me }: { me: Me }) {
  return (
    <>
      <PasswordCard />
      <MfaCard me={me} />
      <SessionsCard />
    </>
  );
}

function PasswordCard() {
  const t = useTranslations("account.password");
  const errorText = useApiError();
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setError(t("mismatch"));
    setBusy(true);
    setError(null);
    try {
      await authApi.changePassword(current, next);
      toast.success(t("changed"));
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t("current")} required>
            <PasswordInput autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("new")} hint={t("hint")} required>
              <PasswordInput autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} />
            </Field>
            <Field label={t("confirm")} error={error} required>
              <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={busy} disabled={!current || !next || !confirm}>
              {t("submit")}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}

function MfaCard({ me }: { me: Me }) {
  const t = useTranslations("account.mfa");
  const tPassword = useTranslations("account.password");
  const tCommon = useTranslations("common");
  const errorText = useApiError();
  const qc = useQueryClient();
  const [setup, setSetup] = React.useState<{ secret: string; otpauth_url: string } | null>(null);
  const [code, setCode] = React.useState("");
  const [recovery, setRecovery] = React.useState<string[] | null>(null);
  const [disableOpen, setDisableOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshMe = () => qc.invalidateQueries({ queryKey: qk.me });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Badge tone={me.mfa_enabled ? "success" : "neutral"}>
            {me.mfa_enabled ? <ShieldCheck /> : <ShieldOff />}
            {me.mfa_enabled ? t("on") : t("off")}
          </Badge>
        }
      />
      <CardBody className="flex flex-col gap-3">
        {me.mfa_required && <p className="text-sm text-muted">{t("required")}</p>}
        {error && !setup && !disableOpen && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div>
          {me.mfa_enabled ? (
            <Button
              variant="danger-ghost"
              disabled={me.mfa_required}
              onClick={() => {
                setPassword("");
                setError(null);
                setDisableOpen(true);
              }}
            >
              {t("disable")}
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={busy && !setup}
              onClick={() =>
                run(async () => {
                  setCode("");
                  setSetup(await authApi.mfaSetup());
                })
              }
            >
              {t("enable")}
            </Button>
          )}
        </div>
      </CardBody>

      {/* Enrolment */}
      <Dialog open={setup !== null && recovery === null} onOpenChange={(o) => !o && setSetup(null)}>
        {setup && (
          <DialogContent
            title={t("title")}
            closeLabel={tCommon("actions.close")}
            footer={
              <>
                <Button onClick={() => setSetup(null)}>{tCommon("actions.cancel")}</Button>
                <Button
                  variant="primary"
                  loading={busy}
                  disabled={code.trim().length < 6}
                  onClick={() =>
                    run(async () => {
                      const res = await authApi.mfaEnable(code);
                      setRecovery(res.recovery_codes);
                      await refreshMe();
                      toast.success(t("enabled"));
                    })
                  }
                >
                  {t("verify")}
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-4">
              <p className="text-base">{t("step1")}</p>
              <div className="self-center rounded-lg border border-border bg-white p-2">
                <QrCode value={setup.otpauth_url} size={176} title={t("title")} />
              </div>
              <div>
                <p className="text-sm text-muted">{t("manual")}</p>
                <code className="mt-1 block select-all break-all rounded bg-surface-2 px-3 py-2 font-mono text-sm">
                  {setup.secret}
                </code>
              </div>
              <p className="text-base">{t("step2")}</p>
              <Field label={t("code")} error={error}>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="h-11 text-center font-mono text-xl tracking-[0.3em]"
                />
              </Field>
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Recovery codes (shown once) */}
      <Dialog
        open={recovery !== null}
        onOpenChange={(o) => {
          if (!o) {
            setRecovery(null);
            setSetup(null);
          }
        }}
      >
        {recovery && (
          <DialogContent
            title={t("recoveryTitle")}
            description={t("recoveryBody")}
            closeLabel={tCommon("actions.close")}
            footer={
              <>
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(recovery.join("\n"));
                    toast.success(tCommon("actions.copied"));
                  }}
                >
                  <Copy />
                  {t("recoveryCopy")}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setRecovery(null);
                    setSetup(null);
                  }}
                >
                  {t("recoveryDone")}
                </Button>
              </>
            }
          >
            <ul className="grid grid-cols-2 gap-2 font-mono text-base">
              {recovery.map((c) => (
                <li key={c} className="select-all rounded bg-surface-2 px-3 py-2 text-center">
                  {c}
                </li>
              ))}
            </ul>
          </DialogContent>
        )}
      </Dialog>

      {/* Disable */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent
          size="sm"
          title={t("disableTitle")}
          description={t("disableBody")}
          closeLabel={tCommon("actions.close")}
          footer={
            <>
              <Button onClick={() => setDisableOpen(false)}>{tCommon("actions.cancel")}</Button>
              <Button
                variant="danger"
                loading={busy}
                disabled={!password}
                onClick={() =>
                  run(async () => {
                    await authApi.mfaDisable(password);
                    await refreshMe();
                    setDisableOpen(false);
                    toast.success(t("disabled"));
                  })
                }
              >
                {t("disable")}
              </Button>
            </>
          }
        >
          <Field label={tPassword("current")} error={error}>
            <PasswordInput
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </Field>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SessionsCard() {
  const t = useTranslations("account.sessions");
  const tCommon = useTranslations("common");
  const errorText = useApiError();
  const confirm = useConfirm();
  const [busy, setBusy] = React.useState(false);

  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} />
      <CardBody>
        <Button
          variant="danger-ghost"
          loading={busy}
          onClick={async () => {
            const ok = await confirm({
              title: t("confirmTitle"),
              description: t("confirmBody"),
              confirmLabel: t("logoutAll"),
              cancelLabel: tCommon("actions.cancel"),
              destructive: true,
            });
            if (!ok) return;
            setBusy(true);
            try {
              await authApi.logoutAll();
              window.location.assign("/login");
            } catch (err) {
              toast.error(errorText(err));
              setBusy(false);
            }
          }}
        >
          {t("logoutAll")}
        </Button>
      </CardBody>
    </Card>
  );
}
