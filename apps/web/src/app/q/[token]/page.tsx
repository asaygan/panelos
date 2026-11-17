import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Building2, Lock, QrCode, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/app/brand";
import { LanguageSwitch } from "@/components/auth/language-switch";
import { Button } from "@/components/ui/button";
import type { QrResolve } from "@/data/types";
import { serverFetch } from "@/lib/api/server";
import { SESSION_COOKIE } from "@/lib/auth/cookies";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("scan");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * Landing page of every printed QR code: /q/<token>.
 *
 * The token is resolved on the server (the scan is logged there, with the
 * scanner's session forwarded). Members go straight to the panel; everyone
 * else sees the public identity card — never schematics — and a sign-in link
 * that returns to the panel.
 */
export default async function ScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("scan");

  let resolved: QrResolve | null = null;
  try {
    resolved = await serverFetch<QrResolve>(`/qr/${encodeURIComponent(token)}`);
  } catch {
    resolved = null;
  }

  if (resolved?.is_member) redirect(`/panels/${resolved.panel_id}`);

  const signedIn = Boolean((await cookies()).get(SESSION_COOKIE));
  const loginHref = resolved
    ? `/login?next=${encodeURIComponent(`/panels/${resolved.panel_id}`)}`
    : "/login";

  return (
    <div className="bg-blueprint flex min-h-dvh flex-col">
      <header className="flex items-center justify-between p-4 text-white">
        <Brand />
        <LanguageSwitch />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-4 sm:items-center">
        <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
          {!resolved ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-warning-soft text-warning">
                <QrCode className="size-6" />
              </span>
              <h1 className="text-xl font-semibold">{t("unknownTitle")}</h1>
              <p className="text-base text-muted">{t("unknownBody")}</p>
            </div>
          ) : resolved.restricted ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
                <Lock className="size-6" />
              </span>
              <p className="font-mono text-lg font-semibold">{resolved.tag}</p>
              <h1 className="text-xl font-semibold">{t("restrictedTitle")}</h1>
              <p className="text-base text-muted">
                {t("restrictedBody", { company: resolved.company_name || "—" })}
              </p>
            </div>
          ) : (
            <>
              <div className="border-b border-border px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle">
                  {t("panel")}
                </p>
                <h1 className="mt-1 font-mono text-2xl font-semibold">{resolved.tag}</h1>
                <p className="mt-0.5 text-lg text-muted">{resolved.name}</p>
              </div>
              <dl className="divide-y divide-border">
                <Row label={t("fields.serial")} value={resolved.serial} mono />
                {resolved.location && <Row label={t("fields.location")} value={resolved.location} />}
                <Row
                  label={t("fields.revision")}
                  value={
                    resolved.active_revision
                      ? t("revisionApproved", {
                          letter: String(
                            (resolved.active_revision as { letter?: string }).letter ?? "",
                          ),
                        })
                      : t("revisionNone")
                  }
                />
              </dl>
              <p className="flex items-start gap-2 border-t border-border bg-surface-2/60 px-5 py-3 text-sm text-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5 shrink-0" aria-hidden />
                  {t("verified", { company: resolved.company_name || "—" })}
                </span>
              </p>
            </>
          )}

          <div className="flex flex-col gap-2 border-t border-border px-5 py-5">
            {resolved && !resolved.restricted && (
              <div>
                <p className="text-base font-medium">{t("signInTitle")}</p>
                <p className="mt-0.5 text-sm text-muted">{t("signInBody")}</p>
              </div>
            )}
            {signedIn && resolved ? (
              <p className="rounded border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-warning">
                {t("notMember")}
              </p>
            ) : (
              <Button asChild variant="primary" size="lg" className="mt-1">
                <Link href={loginHref}>{t("signIn")}</Link>
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className="pb-6 text-center text-xs text-sidebar-muted">{t("poweredBy")}</footer>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={mono ? "font-mono text-base" : "text-base"}>{value || "—"}</dd>
    </div>
  );
}
