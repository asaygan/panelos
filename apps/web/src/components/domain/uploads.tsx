"use client";

import * as React from "react";
import { Camera, FileUp, ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/feedback";
import { IMAGE_TYPES, MAX_UPLOAD_MB, compressImage, uploadFile } from "@/data/upload";
import type { StoredFile } from "@/data/types";
import { cn } from "@/lib/utils/cn";

// ── Single file (PDF / CSV / XLSX) ─────────────────────────────────────────

export interface FileDropzoneProps {
  /** MIME types and/or extensions, e.g. ["application/pdf", ".pdf"]. */
  accept: string[];
  maxMb?: number;
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Text under the main prompt, e.g. "PDF · en fazla 100 MB". */
  hint?: React.ReactNode;
  className?: string;
}

/** Drag-and-drop / click target that validates type + size and hands back one File. */
export function FileDropzone({
  accept,
  maxMb = MAX_UPLOAD_MB,
  onFile,
  disabled,
  hint,
  className,
}: FileDropzoneProps) {
  const t = useTranslations("common.upload");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const take = (file: File | null | undefined) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    const ok = accept.some((a) => (a.startsWith(".") ? name.endsWith(a) : file.type === a));
    if (!ok) return setError(t("wrongType"));
    if (file.size > maxMb * 1024 * 1024) return setError(t("tooLarge", { max: maxMb }));
    setError(null);
    onFile(file);
  };

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          take(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border-strong bg-surface-2/50 px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary-soft/40 disabled:opacity-60",
          over && "border-primary bg-primary-soft/60",
        )}
      >
        <FileUp className="size-6 text-subtle" aria-hidden />
        <span className="text-base font-medium">{t("drop")}</span>
        {hint && <span className="text-xs text-subtle">{hint}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          take(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Photos (field use: camera first, compressed, several at once) ──────────

interface PendingPhoto {
  key: string;
  preview: string;
  progress: number;
  file?: StoredFile;
  failed?: boolean;
}

export interface PhotoUploaderProps {
  /** Called with the ids of all successfully uploaded files whenever the set changes. */
  onChange: (fileIds: string[]) => void;
  /** True while at least one upload is still running (disable submit meanwhile). */
  onBusyChange?: (busy: boolean) => void;
  max?: number;
  className?: string;
}

/**
 * Add photos from the camera or gallery. Each photo is downscaled, uploaded
 * immediately (with progress) and reported by file id, ready to be attached to
 * an issue / maintenance record when the form is submitted.
 */
export function PhotoUploader({ onChange, onBusyChange, max = 10, className }: PhotoUploaderProps) {
  const t = useTranslations("common.upload");
  const [items, setItems] = React.useState<PendingPhoto[]>([]);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    onChange(items.flatMap((i) => (i.file ? [i.file.id] : [])));
    onBusyChange?.(items.some((i) => !i.file && !i.failed));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- report on item changes only
  }, [items]);

  React.useEffect(
    () => () => items.forEach((i) => URL.revokeObjectURL(i.preview)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount
    [],
  );

  const patch = (key: string, change: Partial<PendingPhoto>) =>
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...change } : i)));

  const add = async (list: FileList | null) => {
    if (!list) return;
    const room = max - items.length;
    for (const raw of Array.from(list).slice(0, Math.max(room, 0))) {
      if (!IMAGE_TYPES.includes(raw.type) && !raw.type.startsWith("image/")) continue;
      const key = `${raw.name}-${raw.size}-${Math.random().toString(36).slice(2)}`;
      setItems((prev) => [...prev, { key, preview: URL.createObjectURL(raw), progress: 0 }]);
      try {
        const file = await compressImage(raw);
        const stored = await uploadFile(file, (progress) => patch(key, { progress }));
        patch(key, { file: stored, progress: 100 });
      } catch {
        patch(key, { failed: true });
      }
    }
  };

  return (
    <div className={className}>
      {items.length > 0 && (
        <ul className="mb-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {items.map((i) => (
            <li
              key={i.key}
              className="relative aspect-square overflow-hidden rounded border border-border bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              <img src={i.preview} alt="" className="size-full object-cover" />
              {!i.file && !i.failed && (
                <div className="absolute inset-0 grid place-items-center bg-black/45 text-xs font-medium text-white">
                  <Spinner className="text-white" />
                </div>
              )}
              {i.failed && (
                <div className="absolute inset-0 grid place-items-center bg-danger/70 px-1 text-center text-2xs font-medium text-white">
                  {t("failed")}
                </div>
              )}
              <button
                type="button"
                aria-label={t("removeFile")}
                onClick={() => {
                  URL.revokeObjectURL(i.preview);
                  setItems((prev) => prev.filter((p) => p.key !== i.key));
                }}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length < max && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => cameraRef.current?.click()} className="sm:hidden">
            <Camera />
            {t("takePhoto")}
          </Button>
          <Button size="sm" onClick={() => galleryRef.current?.click()}>
            <ImagePlus />
            {t("dropPhotos")}
          </Button>
        </div>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void add(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          void add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
