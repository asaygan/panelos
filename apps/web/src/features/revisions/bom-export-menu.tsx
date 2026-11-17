"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import { exchangeApi } from "@/data/api";

/** Download the live revision's BOM as Excel or CSV. */
export function BomExportMenu({ panelId }: { panelId: string }) {
  const t = useTranslations("revisions.bom");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Download />
          {t("export")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t("exportLive")}</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={exchangeApi.bomExportUrl(panelId, "xlsx")} download>
            {t("exportXlsx")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={exchangeApi.bomExportUrl(panelId, "csv")} download>
            {t("exportCsv")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
