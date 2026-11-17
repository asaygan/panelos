import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { IssueDetailView } from "@/features/issues/issue-detail-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("issues");
  return { title: t("title") };
}

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssueDetailView id={id} />;
}
