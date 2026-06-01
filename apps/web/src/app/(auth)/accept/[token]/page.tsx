import type { components } from "@panelos/types/generated";
import { AcceptInviteForm } from "./accept-form";
import { AcceptShell } from "./accept-shell";

type InvitationInfo = components["schemas"]["InvitationInfoOut"];

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  engineer: "Engineer",
  technician: "Technician",
  viewer: "Viewer",
};

async function fetchInvitation(token: string): Promise<InvitationInfo | { error: "invalid" | "network" }> {
  const apiBase =
    process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  try {
    const res = await fetch(`${apiBase}/api/v1/auth/invitations/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    if (!res.ok) return { error: "invalid" };
    return (await res.json()) as InvitationInfo;
  } catch {
    return { error: "network" };
  }
}

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const info = await fetchInvitation(token);

  if ("error" in info) {
    return (
      <AcceptShell>
        <Notice
          title={info.error === "network" ? "Something went wrong" : "Invitation not found"}
          body={
            info.error === "network"
              ? "We couldn't reach the server. Check your connection and try again."
              : "This invitation link is invalid or no longer exists. Ask your administrator to resend it."
          }
        />
      </AcceptShell>
    );
  }

  if (info.expired) {
    return (
      <AcceptShell>
        <Notice
          title="Invitation expired"
          body={`The invitation for ${info.email} has expired. Ask an administrator to send a new one.`}
        />
      </AcceptShell>
    );
  }

  if (info.accepted) {
    return (
      <AcceptShell>
        <Notice
          title="Already accepted"
          body={`This invitation has already been used. Sign in with ${info.email} to continue.`}
          cta={{ href: "/login", label: "Go to sign in" }}
        />
      </AcceptShell>
    );
  }

  return (
    <AcceptShell>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em" }}>
        Join {info.company_name}
      </div>
      <div
        style={{
          fontSize: "var(--fz-sm)",
          color: "var(--c-ink-3)",
          marginTop: 4,
          marginBottom: 18,
        }}
      >
        You&apos;ve been invited as{" "}
        <strong style={{ color: "var(--c-ink-2)" }}>
          {ROLE_LABELS[info.role.toLowerCase()] ?? info.role}
        </strong>
        . Set a password to activate your account.
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--c-ink-2)",
          background: "var(--c-surface-3)",
          border: "1px solid var(--c-line)",
          borderRadius: "var(--r-sm)",
          padding: "7px 10px",
          marginBottom: 16,
        }}
      >
        <span className="mono">{info.email}</span>
      </div>
      <AcceptInviteForm token={token} />
    </AcceptShell>
  );
}

function Notice({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-.01em" }}>{title}</div>
      <div style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-3)", marginTop: 8, lineHeight: 1.55 }}>
        {body}
      </div>
      {cta && (
        <a
          href={cta.href}
          style={{
            display: "inline-block",
            marginTop: 18,
            fontSize: 13,
            color: "var(--c-accent)",
            fontWeight: 560,
            textDecoration: "none",
          }}
        >
          {cta.label} →
        </a>
      )}
    </div>
  );
}
