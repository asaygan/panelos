import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { TemplateDesigner } from "@/features/labels/designer/template-designer";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("labels");
  return { title: t("designer.title") };
}

export default function LabelTemplatesPage() {
  return <TemplateDesigner />;
}
