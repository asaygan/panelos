"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { RoleBadge } from "@/components/domain/badges";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Page, PageHeader } from "@/components/ui/page";
import { toast } from "@/components/ui/toaster";
import { useMe, useUpdateProfile } from "@/data/hooks";
import type { Role } from "@/data/types";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { setLocaleAction } from "@/lib/preferences-actions";
import { applyTheme, type ThemePreference } from "@/lib/theme";
import { useApiError } from "@/lib/use-api-error";
import { NotificationPrefs } from "./notification-prefs";
import { SecuritySettings } from "./security-settings";

const TABS = ["profile", "security", "notifications"] as const;
type Tab = (typeof TABS)[number];

export function AccountView() {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("tab") as Tab | null;
  const tab: Tab = requested && TABS.includes(requested) ? requested : "profile";
  const { data: me, isLoading, isError, refetch } = useMe();

  return (
    <Page width="narrow">
      <PageHeader title={t("title")} description={t("description")} />
      {isLoading ? (
        <Card>
          <SkeletonRows rows={5} />
        </Card>
      ) : isError || !me ? (
        <ErrorState
          title={tCommon("states.errorTitle")}
          description={tCommon("states.errorHint")}
          action={<Button onClick={() => refetch()}>{tCommon("actions.retry")}</Button>}
        />
      ) : (
        <Tabs value={tab} onValueChange={(v) => router.replace(`/account?tab=${v}`, { scroll: false })}>
          <TabsList>
            {TABS.map((k) => (
              <TabsTrigger key={k} value={k}>
                {t(`tabs.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="profile" className="mt-5 flex flex-col gap-5">
            <ProfileCard />
          </TabsContent>
          <TabsContent value="security" className="mt-5 flex flex-col gap-5">
            <SecuritySettings me={me} />
          </TabsContent>
          <TabsContent value="notifications" className="mt-5">
            <NotificationPrefs me={me} />
          </TabsContent>
        </Tabs>
      )}
    </Page>
  );
}

function ProfileCard() {
  const t = useTranslations("account.profile");
  const tCommon = useTranslations("common");
  const tMenu = useTranslations("nav.userMenu");
  const errorText = useApiError();
  const locale = useLocale();
  const { data: me } = useMe();
  const update = useUpdateProfile();
  const [name, setName] = React.useState(me?.name ?? "");
  const [theme, setTheme] = React.useState<ThemePreference>("system");
  const [, startTransition] = React.useTransition();

  React.useEffect(() => {
    const pref = document.documentElement.dataset.themePref as ThemePreference | undefined;
    if (pref) setTheme(pref);
  }, []);

  if (!me) return null;
  const dirty = name.trim() !== me.name && name.trim().length > 0;

  return (
    <>
      <Card>
        <CardHeader title={t("title")} />
        <CardBody>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              update.mutate(
                { name: name.trim() },
                {
                  onSuccess: () => toast.success(t("saved")),
                  onError: (err) => toast.error(errorText(err)),
                },
              );
            }}
          >
            <Field label={t("name")} required>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={200} />
            </Field>
            <Field label={t("email")} hint={t("emailHint")}>
              <Input value={me.email} disabled readOnly />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("language")} hint={t("languageHint")}>
                <Select
                  value={locale}
                  onValueChange={(l) => startTransition(() => setLocaleAction(l))}
                  options={LOCALES.map((l) => ({ value: l, label: LOCALE_NAMES[l] }))}
                />
              </Field>
              <Field label={t("theme")}>
                <Select
                  value={theme}
                  onValueChange={(v) => {
                    applyTheme(v as ThemePreference);
                    setTheme(v as ThemePreference);
                  }}
                  options={[
                    { value: "light", label: tMenu("themeLight") },
                    { value: "dark", label: tMenu("themeDark") },
                    { value: "system", label: tMenu("themeSystem") },
                  ]}
                />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={!dirty} loading={update.isPending}>
                {tCommon("actions.saveChanges")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("organizations")} />
        <ul className="divide-y divide-border">
          {me.companies.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="truncate text-base">{c.name}</span>
              <RoleBadge role={c.role as Role} />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
