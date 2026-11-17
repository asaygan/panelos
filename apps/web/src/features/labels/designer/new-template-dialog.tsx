"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/controls";
import type { LabelTemplate } from "@/data/types";
import type { StartKind } from "./use-template-editor";

/** Name + starting point of a new template. */
export function NewTemplateDialog({
  open,
  onOpenChange,
  templates,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: LabelTemplate[];
  onCreate: (opts: { name: string; kind: StartKind; copyFromId?: string }) => void;
}) {
  const t = useTranslations("labels");
  const tc = useTranslations("common");
  const [name, setName] = React.useState("");
  const [start, setStart] = React.useState("sample-engraved");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setStart("sample-engraved");
      setError(null);
    }
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("designer.nameRequired"));
      return;
    }
    const copy = start.startsWith("copy:");
    onCreate({
      name: name.trim(),
      kind: copy ? "copy" : (start as StartKind),
      copyFromId: copy ? start.slice(5) : undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("new.title")}
        description={t("new.description")}
        closeLabel={tc("actions.close")}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {tc("actions.cancel")}
            </Button>
            <Button type="submit" form="new-template-form">
              {tc("actions.create")}
            </Button>
          </>
        }
      >
        <form id="new-template-form" onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t("new.name")} error={error} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} />
          </Field>
          <Field label={t("new.start")}>
            <Select
              value={start}
              onValueChange={setStart}
              options={[
                { value: "sample-engraved", label: t("new.sampleEngraved") },
                { value: "sample-print", label: t("new.samplePrint") },
                { value: "blank-engraved", label: t("new.blankEngraved") },
                { value: "blank-plain", label: t("new.blankPlain") },
                ...templates.map((x) => ({ value: `copy:${x.id}`, label: t("new.copyOf", { name: x.name }) })),
              ]}
            />
          </Field>
        </form>
      </DialogContent>
    </Dialog>
  );
}
