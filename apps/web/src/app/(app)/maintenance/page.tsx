import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { MaintenanceView } from "@/features/maintenance/maintenance-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("maintenance");
  return { title: t("title") };
}

export default function MaintenancePage() {
  return (
    <Suspense>
      <MaintenanceView />
    </Suspense>
  );
}
