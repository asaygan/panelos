"use client";

import * as React from "react";
import { CheckCircle2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { FileDropzone } from "@/components/domain/uploads";
import { useRevisionMutations, useSheetMutations } from "@/data/hooks";
import { MAX_UPLOAD_MB, uploadFile } from "@/data/upload";
import type { Revision } from "@/data/types";
import { useFmt } from "@/lib/format";
import { useApiError } from "@/lib/use-api-error";

interface QueueItem {
  key: string;
  file: File;
  number: string;
  title: string;
  state: "ready" | "uploading" | "done" | "failed";
  progress: number;
}

export interface UploadSchematicDialogProps {
  panelId: string;
  /** The panel's current draft revision, if any. Without one the dialog asks to start it. */
  draft: Revision | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the revision id the sheets went into. */
  onUploaded?: (revisionId: string) => void;
}

/** Queue several PDFs, name each sheet, upload them one after another and attach them to the draft. */
export function UploadSchematicDialog({ panelId, draft, open, onOpenChange, onUploaded }: UploadSchematicDialogProps) {
  const t = useTranslations("schematics.upload");
  const tc = useTranslations("common.actions");
  const errorText = useApiError();
  const fmt = useFmt();
  const { create } = useRevisionMutations();
  const { attach } = useSheetMutations(panelId);

  const [created, setCreated] = React.useState<Revision | null>(null);
  const [summary, setSummary] = React.useState("");
  const [items, setItems] = React.useState<QueueItem[]>([]);
  const [busy, setBusy] = React.useState(false);

  const target = draft ?? created;

  React.useEffect(() => {
    if (!open) {
      setItems([]);
      setSummary("");
      setCreated(null);
    }
  }, [open]);

  const patch = (key: string, change: Partial<QueueItem>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...change } : i)));

  const addFile = (file: File) => {
    const base = file.name.replace(/\.pdf$/i, "");
    setItems((prev) => [
      ...prev,
      {
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        number: String((target?.sheet_count ?? 0) + prev.length + 1),
        title: base,
        state: "ready",
        progress: 0,
      },
    ]);
  };

  const startDraft = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { panelId, summary: summary.trim() || null },
      {
        onSuccess: (rev) => {
          setCreated(rev);
          toast.success(t("started", { letter: rev.revision_letter }));
        },
        onError: (err) => toast.error(errorText(err)),
      },
    );
  };

  const pending = items.filter((i) => i.state === "ready" || i.state === "failed");
  const valid = pending.length > 0 && pending.every((i) => i.number.trim() && i.title.trim());

  const uploadAll = async () => {
    if (!target) return;
    setBusy(true);
    let okCount = 0;
    let failedCount = 0;
    for (const item of pending) {
      patch(item.key, { state: "uploading", progress: 0 });
      try {
        const stored = await uploadFile(item.file, (progress) => patch(item.key, { progress }));
        await attach.mutateAsync({
          revisionId: target.id,
          body: {
            file_id: stored.id,
            sheet_number: item.number.trim(),
            sheet_title: item.title.trim(),
            page_index: 0,
          },
        });
        patch(item.key, { state: "done", progress: 100 });
        okCount += 1;
      } catch (err) {
        patch(item.key, { state: "failed" });
        failedCount += 1;
        toast.error(`${item.file.name}: ${errorText(err)}`);
      }
    }
    setBusy(false);
    if (okCount > 0) {
      toast.success(t("uploaded", { count: okCount }));
      onUploaded?.(target.id);
    }
    if (failedCount === 0) onOpenChange(false);
  };

  const footer = !target ? (
    <>
      <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={create.isPending}>
        {tc("cancel")}
      </Button>
      <Button type="submit" form="start-draft-form" variant="primary" loading={create.isPending}>
        {t("startAction")}
      </Button>
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
        {tc("cancel")}
      </Button>
      <Button variant="primary" onClick={() => void uploadAll()} disabled={!valid} loading={busy}>
        {t("uploadAll", { count: pending.length })}
      </Button>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !(busy || create.isPending) && onOpenChange(o)}>
      <DialogContent
        size="lg"
        title={target ? t("title") : t("startTitle")}
        description={target ? t("description", { letter: target.revision_letter }) : t("startBody")}
        closeLabel={tc("close")}
        footer={footer}
      >
        {!target ? (
          <form id="start-draft-form" onSubmit={startDraft}>
            <Field label={t("summaryLabel")}>
              <Textarea
                value={summary}
                rows={3}
                maxLength={2000}
                placeholder={t("summaryPlaceholder")}
                onChange={(e) => setSummary(e.target.value)}
              />
            </Field>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <FileDropzone
              accept={["application/pdf", ".pdf"]}
              maxMb={MAX_UPLOAD_MB}
              onFile={addFile}
              disabled={busy}
              hint={t("dropHint", { max: MAX_UPLOAD_MB })}
            />
            {items.length === 0 ? (
              <p className="text-center text-xs text-subtle">{t("queueHint")}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {items.map((i) => (
                  <li key={i.key} className="rounded-lg border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="truncate">
                        {i.file.name} · {fmt.bytes(i.file.size)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {i.state === "done" && (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="size-3.5" aria-hidden />
                            {t("statusDone")}
                          </span>
                        )}
                        {i.state === "failed" && <span className="text-danger">{t("statusFailed")}</span>}
                        {i.state === "uploading" && t("statusUploading", { percent: i.progress })}
                        {(i.state === "ready" || i.state === "failed") && !busy && (
                          <button
                            type="button"
                            aria-label={t("removeItem")}
                            onClick={() => setItems((prev) => prev.filter((p) => p.key !== i.key))}
                            className="grid size-6 place-items-center rounded hover:bg-surface-2"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[7rem_1fr]">
                      <Field label={t("sheetNumber")}>
                        <Input
                          value={i.number}
                          maxLength={40}
                          disabled={i.state === "uploading" || i.state === "done"}
                          onChange={(e) => patch(i.key, { number: e.target.value })}
                        />
                      </Field>
                      <Field label={t("sheetTitle")}>
                        <Input
                          value={i.title}
                          maxLength={200}
                          disabled={i.state === "uploading" || i.state === "done"}
                          onChange={(e) => patch(i.key, { title: e.target.value })}
                        />
                      </Field>
                    </div>
                    {i.state === "uploading" && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
                        <div
                          className="h-full bg-primary transition-[width]"
                          style={{ width: `${i.progress}%` }}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
