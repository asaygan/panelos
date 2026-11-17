"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES } from "@/i18n/config";
import { setLocaleAction } from "@/lib/preferences-actions";
import { cn } from "@/lib/utils/cn";

/** TR | EN toggle for screens outside the app shell. */
export function LanguageSwitch() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label={t("language")} className="flex rounded border border-border p-0.5">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() => l !== locale && start(() => setLocaleAction(l))}
          className={cn(
            "h-7 rounded-sm px-2 text-xs font-semibold uppercase text-subtle",
            l === locale && "bg-surface-2 text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
