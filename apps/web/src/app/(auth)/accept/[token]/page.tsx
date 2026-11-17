import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { API_ORIGIN } from "@/lib/api/origin";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { robots: { index: false } };

interface InvitationInfo {
  email: string;
  company_name: string;
  role: string;
  expired: boolean;
  accepted: boolean;
}

async function loadInvitation(token: string): Promise<InvitationInfo | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/auth/invitations/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as InvitationInfo) : null;
  } catch {
    return null;
  }
}

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getTranslations("auth.accept");
  const tLogin = await getTranslations("auth.login");
  const tRoles = await getTranslations("common.roles");
  const info = await loadInvitation(token);

  const problem = !info ? "invalid" : info.accepted ? "used" : info.expired ? "expired" : null;
  if (problem) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">{t(`${problem}Title`)}</h1>
        <p className="text-base text-muted">{t(`${problem}Body`)}</p>
        <Button asChild variant={problem === "used" ? "primary" : "secondary"} size="lg">
          <Link href="/login">{tLogin("submit")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold">{t("title", { company: info!.company_name })}</h1>
        <p className="mt-1.5 text-base text-muted">
          {t("subtitle", { email: info!.email, role: tRoles(info!.role as "owner") })}
        </p>
      </div>
      <AcceptForm token={token} />
    </div>
  );
}
