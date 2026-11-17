"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Check, Languages, LogOut, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { LOCALES, LOCALE_NAMES } from "@/i18n/config";
import { logoutAction, switchCompanyAction } from "@/lib/auth/server-actions";
import { setLocaleAction } from "@/lib/preferences-actions";
import { applyTheme, type ThemePreference } from "@/lib/theme";

export interface ShellUser {
  name: string;
  email: string;
  role: string | null;
}

export interface ShellCompany {
  id: string;
  name: string;
  role: string;
}

export function UserMenu({
  user,
  companies,
  activeCompanyId,
}: {
  user: ShellUser;
  companies: ShellCompany[];
  activeCompanyId: string | null;
}) {
  const t = useTranslations("nav.userMenu");
  const tRoles = useTranslations("common.roles");
  const locale = useLocale();
  const [theme, setTheme] = React.useState<ThemePreference>("light");
  const [, startTransition] = React.useTransition();

  React.useEffect(() => {
    const pref = document.documentElement.dataset.themePref as ThemePreference | undefined;
    if (pref) setTheme(pref);
  }, []);

  const themes: { value: ThemePreference; icon: React.ReactNode; label: string }[] = [
    { value: "light", icon: <Sun />, label: t("themeLight") },
    { value: "dark", icon: <Moon />, label: t("themeDark") },
    { value: "system", icon: <Monitor />, label: t("themeSystem") },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 hover:bg-surface-2"
          aria-label={user.name}
        >
          <Avatar name={user.name} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <div className="px-2 py-2">
          <div className="truncate text-base font-medium">{user.name}</div>
          <div className="truncate text-xs text-subtle">{user.email}</div>
          {user.role && (
            <div className="mt-1 text-xs text-muted">{tRoles(user.role as "owner")}</div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <UserRound />
            {t("account")}
          </Link>
        </DropdownMenuItem>

        {companies.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("switchCompany")}</DropdownMenuLabel>
            {companies.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onSelect={() => {
                  if (c.id !== activeCompanyId) startTransition(() => switchCompanyAction(c.id));
                }}
              >
                <Building2 />
                <span className="flex-1 truncate">{c.name}</span>
                {c.id === activeCompanyId && <Check className="!text-primary" />}
              </DropdownMenuItem>
            ))}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => {
              if (l !== locale) startTransition(() => setLocaleAction(l));
            }}
          >
            <Languages />
            <span className="flex-1">{LOCALE_NAMES[l]}</span>
            {l === locale && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("theme")}</DropdownMenuLabel>
        {themes.map((th) => (
          <DropdownMenuItem
            key={th.value}
            onSelect={(e) => {
              e.preventDefault(); // keep the menu open so the change is visible
              applyTheme(th.value);
              setTheme(th.value);
            }}
          >
            {th.icon}
            <span className="flex-1">{th.label}</span>
            {theme === th.value && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => startTransition(() => logoutAction())}>
          <LogOut />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
