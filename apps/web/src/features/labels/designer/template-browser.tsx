"use client";

import { Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { useDesignerData } from "../use-label-data";
import { LabelPreview } from "../label-preview";
import { layoutFromTemplate } from "../label-utils";
import type { TemplateEditor } from "./use-template-editor";

/** Read-only gallery of templates (phones, or members who may not design). */
export function TemplateBrowser({ editor, canEdit }: { editor: TemplateEditor; canEdit: boolean }) {
  const t = useTranslations("labels");
  const data = useDesignerData(undefined);

  if (editor.templates.length === 0) {
    return (
      <Card>
        <EmptyState title={t("designer.noTemplates")} description={t("designer.noTemplatesHint")} />
      </Card>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {editor.templates.map((tpl) => (
        <li key={tpl.id}>
          <Card>
            <CardBody className="flex flex-col gap-3">
              <LabelPreview layout={layoutFromTemplate(tpl)} data={data} maxHeightRatio={0.3} />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-base font-medium">
                    <span className="truncate">{tpl.name}</span>
                    {tpl.is_default && <Badge tone="primary">{t("options.defaultMark")}</Badge>}
                  </p>
                  <p className="font-mono text-xs text-subtle">{tpl.size_mm} mm</p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    {!tpl.is_default && (
                      <Button variant="secondary" size="sm" onClick={() => void editor.makeDefault(tpl.id)}>
                        <Star />
                        {t("designer.setDefault")}
                      </Button>
                    )}
                    <Button
                      variant="danger-ghost"
                      size="icon-sm"
                      aria-label={t("designer.deleteTemplate", { name: tpl.name })}
                      onClick={() => void editor.deleteTemplate(tpl.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </li>
      ))}
    </ul>
  );
}
