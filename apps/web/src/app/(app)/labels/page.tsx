import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LabelsScreen } from "@/features/labels/labels-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("labels");
  return { title: t("page.title") };
}

export default function LabelsPage() {
  return (
    <Suspense>
      <LabelsScreen />
    </Suspense>
  );
}
