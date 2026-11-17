"use client";

import * as React from "react";
import { Download, FileText, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFmt } from "@/lib/format";
import type { Attachment } from "@/data/types";

/**
 * Thumbnails for photos, rows for other files. Clicking a photo opens it
 * full size. `onRemove` is only passed when the viewer may delete.
 */
export function AttachmentGallery({
  attachments,
  onRemove,
}: {
  attachments: Attachment[];
  onRemove?: (attachment: Attachment) => void;
}) {
  const t = useTranslations("common");
  const fmt = useFmt();
  const [open, setOpen] = React.useState<Attachment | null>(null);
  const photos = attachments.filter((a) => a.mime.startsWith("image/"));
  const files = attachments.filter((a) => !a.mime.startsWith("image/"));

  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((a) => (
            <li key={a.id} className="group relative">
              <button
                type="button"
                onClick={() => setOpen(a)}
                className="block aspect-square w-full overflow-hidden rounded border border-border bg-surface-2"
                aria-label={a.caption || a.filename}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                <img src={a.url} alt={a.caption ?? ""} loading="lazy" className="size-full object-cover" />
              </button>
              {onRemove && (
                <button
                  type="button"
                  aria-label={t("actions.remove")}
                  onClick={() => onRemove(a)}
                  className="absolute right-1 top-1 hidden size-6 place-items-center rounded-full bg-black/60 text-white group-focus-within:grid group-hover:grid"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <ul className="divide-y divide-border rounded border border-border">
          {files.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2">
              <FileText className="size-4 shrink-0 text-subtle" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate text-base">{a.caption || a.filename}</div>
                <div className="text-xs text-subtle">
                  {fmt.bytes(a.byte_size)} · {a.uploaded_by_name ?? t("states.unknown")} ·{" "}
                  {fmt.date(a.created_at)}
                </div>
              </div>
              <Button asChild variant="ghost" size="icon-sm">
                <a href={a.url} target="_blank" rel="noreferrer" aria-label={t("actions.download")}>
                  <Download />
                </a>
              </Button>
              {onRemove && (
                <Button
                  variant="danger-ghost"
                  size="icon-sm"
                  aria-label={t("actions.remove")}
                  onClick={() => onRemove(a)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open && (
          <DialogContent
            size="xl"
            title={open.caption || open.filename}
            description={`${open.uploaded_by_name ?? t("states.unknown")} · ${fmt.dateTime(open.created_at)}`}
            closeLabel={t("actions.close")}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img src={open.url} alt={open.caption ?? ""} className="mx-auto max-h-[70dvh] rounded" />
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
