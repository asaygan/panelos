import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Page, PageHeader } from "@/components/ui/page";
import { RevisionQueue } from "@/features/revisions/revision-queue";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("revisions");
  return { title: t("title") };
}

export default async function RevisionsPage() {
  const t = await getTranslations("revisions");
  return (
    <Page>
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense>
        <RevisionQueue />
      </Suspense>
    </Page>
  );
}
