import Link from "next/link";
import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common.pages");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-subtle">
        <Compass className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <p className="max-w-sm text-base text-muted">{t("notFoundBody")}</p>
      <Button asChild variant="primary" className="mt-2">
        <Link href="/dashboard">{t("home")}</Link>
      </Button>
    </div>
  );
}
