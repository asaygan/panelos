"use client";

import { ChevronDown, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { exchangeApi, type ExportDataset } from "@/data/api";

/** Download menu (xlsx / csv) for a dataset. Callers gate it with export_data. */
export function ExportMenu({ dataset }: { dataset: Extract<ExportDataset, "issues" | "maintenance"> }) {
  const t = useTranslations(dataset);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Download />
          {t("export.label")}
          <ChevronDown className="!size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {(["xlsx", "csv"] as const).map((format) => (
          <DropdownMenuItem key={format} asChild>
            <a href={exchangeApi.exportUrl(dataset, format)} download>
              {t(`export.${format}`)}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
