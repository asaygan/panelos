import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/app/brand";
import { LanguageSwitch } from "./language-switch";

/**
 * Shared frame for sign-in / password / invitation screens: a brand panel on
 * wide screens, a single centered column on phones.
 */
export async function AuthFrame({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("auth.hero");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="bg-blueprint relative hidden flex-col justify-between p-10 text-sidebar-foreground lg:flex">
        <Brand className="text-white" />
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight text-white">{t("title")}</h1>
          <p className="mt-4 text-lg text-sidebar-muted">{t("subtitle")}</p>
          <ul className="mt-8 flex flex-col gap-3">
            {(["point1", "point2", "point3"] as const).map((k) => (
              <li key={k} className="flex items-center gap-3 text-base">
                <span className="grid size-5 place-items-center rounded-full bg-primary/20 text-primary">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {t(k)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-sidebar-muted">© PanelOS</p>
      </aside>
      <main className="flex min-h-dvh flex-col bg-surface">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Brand className="lg:invisible" />
          <LanguageSwitch />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
