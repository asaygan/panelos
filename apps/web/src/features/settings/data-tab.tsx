"use client";

import Link from "next/link";
import { Download, FileSpreadsheet, FileUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { exchangeApi, type ExportDataset } from "@/data/api";
import { usePermissions } from "@/data/hooks";
import type { Permission } from "@/data/types";

const DATASETS: { key: "panels" | "issues" | "maintenance" | "audit"; dataset: ExportDataset; perm: Permission }[] = [
  { key: "panels", dataset: "panels", perm: "export_data" },
  { key: "issues", dataset: "issues", perm: "export_data" },
  { key: "maintenance", dataset: "maintenance", perm: "export_data" },
  { key: "audit", dataset: "audit-logs", perm: "view_audit" },
];

export function DataTab() {
  const t = useTranslations("settings.data");
  const { can } = usePermissions();

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title={t("export.title")} description={t("export.description")} />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          {DATASETS.map((d) => {
            const allowed = can(d.perm);
            return (
              <div key={d.key} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-subtle" aria-hidden />
                  <div className="min-w-0">
                    <h3 className="text-base font-medium">{t(`export.${d.key}.title`)}</h3>
                    <p className="mt-0.5 text-sm text-muted">
                      {allowed ? t(`export.${d.key}.description`) : t("export.noPermission")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["xlsx", "csv"] as const).map((f) =>
                    allowed ? (
                      <Button key={f} size="sm" asChild>
                        <a href={exchangeApi.exportUrl(d.dataset, f)} download>
                          <Download />
                          {t(`export.format.${f}`)}
                        </a>
                      </Button>
                    ) : (
                      <Button key={f} size="sm" disabled>
                        <Download />
                        {t(`export.format.${f}`)}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>

      {can("crud_panels") && (
        <Card>
          <CardHeader title={t("import.title")} description={t("import.description")} />
          <CardBody>
            <Button asChild>
              <Link href="/panels?import=1">
                <FileUp />
                {t("import.cta")}
              </Link>
            </Button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
