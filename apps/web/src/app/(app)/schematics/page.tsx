import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SchematicsPageView } from "@/features/schematics/schematics-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schematics");
  return { title: t("title") };
}

export default function SchematicsPage() {
  return (
    <Suspense>
      <SchematicsPageView />
    </Suspense>
  );
}
