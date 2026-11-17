import Link from "next/link";
import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Page } from "@/components/ui/page";

/** 404 inside the app keeps the navigation around it. */
export default async function AppNotFound() {
  const t = await getTranslations("common.pages");
  return (
    <Page>
      <EmptyState
        icon={<Compass />}
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
        action={
          <Button asChild variant="primary">
            <Link href="/dashboard">{t("home")}</Link>
          </Button>
        }
      />
    </Page>
  );
}
