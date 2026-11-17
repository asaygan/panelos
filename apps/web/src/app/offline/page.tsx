import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Brand } from "@/components/app/brand";
import { ReloadWhenOnline } from "./reload-when-online";

export const metadata: Metadata = { robots: { index: false } };

/** Shown by the service worker when a page can't be loaded without a connection. */
export default async function OfflinePage() {
  const t = await getTranslations("scan");
  return (
    <div className="bg-blueprint flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center text-white">
      <Brand />
      <span className="grid size-14 place-items-center rounded-full bg-white/10">
        <WifiOff className="size-7" />
      </span>
      <div>
        <h1 className="text-2xl font-semibold">{t("offlineTitle")}</h1>
        <p className="mt-2 max-w-sm text-base text-sidebar-muted">{t("offlineBody")}</p>
      </div>
      <ReloadWhenOnline />
    </div>
  );
}
