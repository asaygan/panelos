"use client";

import Link from "next/link";
import { ArrowRight, FileStack, Tags } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardBody } from "@/components/ui/card";

export function LabelsTab() {
  const t = useTranslations("settings.labels");
  const items = [
    { key: "templates", href: "/settings/label-templates", icon: <FileStack /> },
    { key: "print", href: "/labels", icon: <Tags /> },
  ] as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          <Card className="h-full transition-colors group-hover:border-border-strong group-hover:bg-surface-2">
            <CardBody className="flex h-full flex-col gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary [&_svg]:size-5">
                {i.icon}
              </span>
              <div>
                <h2 className="text-base font-semibold">{t(`${i.key}.title`)}</h2>
                <p className="mt-1 text-sm text-muted">{t(`${i.key}.description`)}</p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                {t(`${i.key}.cta`)}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </CardBody>
          </Card>
        </Link>
      ))}
    </div>
  );
}
