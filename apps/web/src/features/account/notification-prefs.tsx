"use client";

import { useTranslations } from "next-intl";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/controls";
import { toast } from "@/components/ui/toaster";
import { useUpdateProfile } from "@/data/hooks";
import type { Me } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

const KINDS = [
  "revision_submitted",
  "revision_approved",
  "revision_rejected",
  "issue_reported",
  "issue_assigned",
  "issue_resolved",
  "maintenance_due",
] as const;
type Kind = (typeof KINDS)[number];
type Channel = "in_app" | "email";

/** Per-event toggles; a missing preference means "on" (the API's default). */
export function NotificationPrefs({ me }: { me: Me }) {
  const t = useTranslations("account.notifications");
  const errorText = useApiError();
  const update = useUpdateProfile();
  const prefs = me.notification_prefs ?? {};
  const enabled = (channel: Channel, kind: Kind) => prefs[channel]?.[kind] ?? true;

  const toggle = (channel: Channel, kind: Kind, value: boolean) =>
    update.mutate(
      {
        notification_prefs: {
          in_app: { ...(prefs.in_app ?? {}) },
          email: { ...(prefs.email ?? {}) },
          [channel]: { ...(prefs[channel] ?? {}), [kind]: value },
        },
      },
      {
        onSuccess: () => toast.success(t("saved")),
        onError: (err) => toast.error(errorText(err)),
      },
    );

  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} />
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-subtle">
        <span>{t("event")}</span>
        <span className="w-16 text-center">{t("inApp")}</span>
        <span className="w-16 text-center">{t("email")}</span>
      </div>
      <ul className="divide-y divide-border border-t border-border">
        {KINDS.map((kind) => {
          const title = t(`kinds.${kind}.title`);
          const hint = t(`kinds.${kind}.hint`);
          return (
            <li key={kind} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 px-4 py-3">
              <div className="min-w-0">
                <div className="text-base">{title}</div>
                {hint && <div className="text-xs text-subtle">{hint}</div>}
              </div>
              {(["in_app", "email"] as const).map((channel) => (
                <div key={channel} className="grid w-16 place-items-center">
                  <Checkbox
                    checked={enabled(channel, kind)}
                    disabled={update.isPending}
                    onCheckedChange={(v) => toggle(channel, kind, v === true)}
                    aria-label={`${title} — ${channel === "email" ? t("email") : t("inApp")}`}
                  />
                </div>
              ))}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
