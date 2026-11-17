"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataItem } from "@/components/ui/page";
import { useFmt } from "@/lib/format";
import type { Panel } from "@/data/types";
import { GlanceCards } from "./glance-cards";
import { QrCard } from "./qr-card";
import type { PanelTab } from "./tabs";

const text = (v: string | null | undefined) => v?.trim() || null;

export function OverviewTab({ panel, onTab }: { panel: Panel; onTab: (tab: PanelTab) => void }) {
  const t = useTranslations("panelDetail.details");
  const tf = useTranslations("common.fields");
  const fmt = useFmt();

  return (
    <div className="flex flex-col gap-5">
      <GlanceCards panel={panel} onTab={onTab} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader title={t("title")} />
          <CardBody className="flex flex-col gap-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
              <DataItem label={tf("tag")} mono>{text(panel.tag)}</DataItem>
              <DataItem label={tf("serial")} mono>{text(panel.serial)}</DataItem>
              <DataItem label={tf("project")}>{text(panel.project_name)}</DataItem>
              <DataItem label={tf("group")}>{text(panel.group_name)}</DataItem>
              <DataItem label={tf("location")}>{text(panel.location_name)}</DataItem>
              <DataItem label={tf("area")}>{text(panel.area)}</DataItem>
              <DataItem label={tf("voltage")}>{text(panel.voltage)}</DataItem>
              <DataItem label={tf("current")}>{text(panel.current_a)}</DataItem>
              <DataItem label={tf("phase")}>{text(panel.phase)}</DataItem>
              <DataItem label={tf("manufacturer")}>{text(panel.mfr)}</DataItem>
              <DataItem label={tf("customer")}>{text(panel.customer)}</DataItem>
              <DataItem label={tf("enclosure")}>{text(panel.enclosure)}</DataItem>
              <DataItem label={tf("ipClass")}>{text(panel.ip_class)}</DataItem>
              <DataItem label={tf("installedAt")}>{panel.installed_at ? fmt.date(panel.installed_at) : null}</DataItem>
              <DataItem label={tf("createdAt")}>{fmt.dateTime(panel.created_at)}</DataItem>
              <DataItem label={tf("updatedAt")}>{fmt.dateTime(panel.updated_at)}</DataItem>
            </dl>
            {text(panel.notes) && (
              <div className="border-t border-border pt-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-subtle">{t("notes")}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-base">{panel.notes}</p>
              </div>
            )}
          </CardBody>
        </Card>
        <QrCard panel={panel} />
      </div>
    </div>
  );
}
