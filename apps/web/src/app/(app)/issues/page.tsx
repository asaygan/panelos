import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { IssuesView } from "@/features/issues/issues-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("issues");
  return { title: t("title") };
}

export default function IssuesPage() {
  return (
    <Suspense>
      <IssuesView />
    </Suspense>
  );
}
