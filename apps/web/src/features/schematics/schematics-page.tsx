"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Page, PageHeader } from "@/components/ui/page";
import { PanelPicker } from "@/components/domain/panel-picker";
import { usePanel } from "@/data/hooks";
import { PanelSchematicsTab } from "@/features/revisions/panel-schematics-tab";

/** /schematics: pick a panel (kept in ?panel=) and view its schematics. */
export function SchematicsPageView() {
  const t = useTranslations("schematics");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const panelId = useSearchParams().get("panel") ?? undefined;
  const panel = usePanel(panelId);

  return (
    <Page>
      <PageHeader title={t("title")} description={t("description")} />
      <Field label={t("panelLabel")} className="max-w-xl">
        <PanelPicker
          value={panelId}
          onChange={(id) => router.replace(`${pathname}?panel=${id}`, { scroll: false })}
        />
      </Field>
      {!panelId ? (
        <Card>
          <EmptyState icon={<FileText />} title={t("empty.title")} description={t("empty.description")} />
        </Card>
      ) : panel.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : panel.isError || !panel.data ? (
        <Card>
          <ErrorState
            title={tc("states.errorTitle")}
            description={tc("states.errorHint")}
            action={<Button onClick={() => void panel.refetch()}>{tc("actions.retry")}</Button>}
          />
        </Card>
      ) : (
        <PanelSchematicsTab panel={panel.data} />
      )}
    </Page>
  );
}
