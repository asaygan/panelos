"use client";

import * as React from "react";
import { Copy, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { QrCode } from "@/components/domain/qr-code";
import { labelsApi } from "@/data/api";
import type { Panel } from "@/data/types";
import { scanUrl } from "@/lib/api/origin";

export function QrCard({ panel }: { panel: Panel }) {
  const t = useTranslations("panelDetail.qr");
  const tc = useTranslations("common");
  const url = scanUrl(panel.qr_token);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(tc("actions.copied"));
    } catch {
      toast.error(tc("states.errorTitle"));
    }
  };

  return (
    <Card>
      <CardHeader title={t("title")} />
      <CardBody className="flex flex-col items-center gap-4">
        <div className="rounded-lg border border-border bg-white p-1">
          <QrCode value={url} size={168} title={t("alt", { tag: panel.tag })} />
        </div>
        <p className="text-center text-sm text-muted">{t("explain")}</p>
        <div className="flex w-full items-start gap-2 rounded border border-border bg-surface-2 p-2">
          <code
            aria-label={t("linkLabel")}
            className="min-w-0 flex-1 select-all break-all font-mono text-xs"
          >
            {url}
          </code>
          <Button variant="ghost" size="icon-sm" aria-label={t("copyLink")} onClick={() => void copy()}>
            <Copy />
          </Button>
        </div>
        <div className="flex w-full flex-wrap gap-2">
          {(["png", "svg"] as const).map((format) => (
            <Button key={format} asChild size="sm" className="flex-1">
              <a href={labelsApi.qrImageUrl(panel.qr_token, format)} download>
                <Download />
                {t(format === "png" ? "downloadPng" : "downloadSvg")}
              </a>
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
