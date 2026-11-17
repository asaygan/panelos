import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { PanelsWorkspace } from "@/features/panels/workspace/workspace";

export async function generateMetadata() {
  const t = await getTranslations("panels");
  return { title: t("title") };
}

export default function PanelsPage() {
  return (
    <Suspense>
      <PanelsWorkspace />
    </Suspense>
  );
}
