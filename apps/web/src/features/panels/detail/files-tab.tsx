"use client";

import * as React from "react";
import { Camera, FileUp, Images } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AttachmentGallery } from "@/components/domain/attachment-gallery";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { EmptyState, ErrorState, SkeletonRows, Spinner } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAttachmentMutations, useAttachments, useMe, usePermissions } from "@/data/hooks";
import type { Attachment, Panel } from "@/data/types";
import { IMAGE_TYPES, MAX_UPLOAD_MB, compressImage, uploadFile } from "@/data/upload";
import { useApiError } from "@/lib/use-api-error";

function useFileUploads(panelId: string, allowPdf: boolean) {
  const t = useTranslations("panelDetail.files");
  const tu = useTranslations("common.upload");
  const errorText = useApiError();
  const { add } = useAttachmentMutations();
  const [busy, setBusy] = React.useState<{ name: string; progress: number }[]>([]);

  const upload = async (list: FileList | null, caption: string) => {
    if (!list) return;
    let added = 0;
    const files = Array.from(list);
    setBusy(files.map((f) => ({ name: f.name, progress: 0 })));
    for (const [i, raw] of files.entries()) {
      const isImage = IMAGE_TYPES.includes(raw.type) || raw.type.startsWith("image/");
      const isPdf = raw.type === "application/pdf" && allowPdf;
      if (!isImage && !isPdf) {
        toast.error(t("unsupported", { name: raw.name }));
        continue;
      }
      if (raw.size > MAX_UPLOAD_MB * 1024 * 1024) {
        toast.error(`${raw.name}: ${tu("tooLarge", { max: MAX_UPLOAD_MB })}`);
        continue;
      }
      try {
        const file = isImage ? await compressImage(raw) : raw;
        const stored = await uploadFile(file, (progress) =>
          setBusy((prev) => prev.map((b, j) => (j === i ? { ...b, progress } : b))),
        );
        await add.mutateAsync({
          panelId,
          body: { file_id: stored.id, caption: caption.trim() || null },
        });
        added += 1;
      } catch (e) {
        toast.error(`${t("uploadFailed", { name: raw.name })} ${errorText(e)}`);
      }
    }
    setBusy([]);
    if (added > 0) toast.success(t("added", { count: added }));
    return added;
  };

  return { upload, busy };
}

function UploadArea({ panelId }: { panelId: string }) {
  const t = useTranslations("panelDetail.files");
  const { can } = usePermissions();
  const allowPdf = can("upload_pdf");
  const { upload, busy } = useFileUploads(panelId, allowPdf);
  const [caption, setCaption] = React.useState("");
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const pickRef = React.useRef<HTMLInputElement>(null);
  const uploading = busy.length > 0;

  const take = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const added = await upload(files, caption);
    if (added) setCaption("");
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3 border-b border-border p-4">
      <Field label={t("caption")} hint={t("captionHint")}>
        <Input
          value={caption}
          maxLength={200}
          placeholder={t("captionPlaceholder")}
          onChange={(e) => setCaption(e.target.value)}
          disabled={uploading}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="sm:hidden" disabled={uploading} onClick={() => cameraRef.current?.click()}>
          <Camera />
          {t("takePhoto")}
        </Button>
        <Button size="sm" variant="primary" disabled={uploading} onClick={() => pickRef.current?.click()}>
          {allowPdf ? <FileUp /> : <Images />}
          {t("choose")}
        </Button>
        <span className="text-xs text-subtle">
          {t("typesHint", { pdf: String(allowPdf), max: MAX_UPLOAD_MB })}
        </span>
      </div>
      {uploading && (
        <ul className="flex flex-col gap-1.5" role="status">
          {busy.map((b, i) => (
            <li key={`${b.name}-${i}`} className="flex items-center gap-2 text-sm text-muted">
              <Spinner />
              <span className="min-w-0 flex-1 truncate">{b.name}</span>
              <span className="font-tabular text-xs">{b.progress}%</span>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void take(e)}
      />
      <input
        ref={pickRef}
        type="file"
        multiple
        accept={allowPdf ? "image/*,application/pdf" : "image/*"}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void take(e)}
      />
    </div>
  );
}

export function FilesTab({ panel }: { panel: Panel }) {
  const t = useTranslations("panelDetail.files");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const { data: me } = useMe();
  const { data, isLoading, error, refetch, isFetching } = useAttachments(panel.id, { only_general: true });
  const { remove } = useAttachmentMutations();
  const canAdd = can("report_issue") || can("manage_maintenance") || can("crud_panels");
  const canRemoveAny = can("manage_issues");

  const onRemove = async (a: Attachment) => {
    const ok = await confirm({
      title: t("removeTitle"),
      description: t("removeBody"),
      confirmLabel: tc("actions.remove"),
      cancelLabel: tc("actions.cancel"),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(a.id, {
      onSuccess: () => toast.success(t("removed")),
      onError: (e) => toast.error(errorText(e)),
    });
  };

  const removable = (a: Attachment) => canRemoveAny || (!!me && a.uploaded_by === me.id);

  return (
    <Card>
      <CardHeader title={t("title")} description={t("description")} />
      {canAdd && <UploadArea panelId={panel.id} />}
      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : error ? (
        <ErrorState
          title={t("loadError")}
          description={tc("states.errorHint")}
          action={
            <Button loading={isFetching} onClick={() => void refetch()}>
              {tc("actions.retry")}
            </Button>
          }
        />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Images />}
          title={t("emptyTitle")}
          description={canAdd ? t("emptyBody") : t("emptyReadOnly")}
        />
      ) : (
        <CardBody>
          <FilesList attachments={data} removable={removable} onRemove={onRemove} />
        </CardBody>
      )}
    </Card>
  );
}

/**
 * AttachmentGallery shows one remove control set for the whole list, so files
 * the viewer may not delete are rendered in a separate read-only gallery.
 */
function FilesList({
  attachments,
  removable,
  onRemove,
}: {
  attachments: Attachment[];
  removable: (a: Attachment) => boolean;
  onRemove: (a: Attachment) => void;
}) {
  const mine = attachments.filter(removable);
  const others = attachments.filter((a) => !removable(a));
  return (
    <div className="flex flex-col gap-4">
      {mine.length > 0 && <AttachmentGallery attachments={mine} onRemove={onRemove} />}
      {others.length > 0 && <AttachmentGallery attachments={others} />}
    </div>
  );
}
