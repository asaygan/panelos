"use client";

import * as React from "react";
import { ImagePlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { AttachmentGallery } from "@/components/domain/attachment-gallery";
import { PhotoUploader } from "@/components/domain/uploads";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { toast } from "@/components/ui/toaster";
import { useAttachmentMutations } from "@/data/hooks";
import type { Attachment, IssueDetail } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";

/** Photos of an issue with add (uploader) and remove (uploader or manager). */
export function IssuePhotos({
  issue,
  userId,
  isManager,
  canAdd,
}: {
  issue: IssueDetail;
  userId: string | undefined;
  isManager: boolean;
  canAdd: boolean;
}) {
  const t = useTranslations("issues.detail");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const confirm = useConfirm();
  const { add, remove } = useAttachmentMutations();
  const [adding, setAdding] = React.useState(false);
  const [fileIds, setFileIds] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const attachments = issue.attachments ?? [];
  const removable = attachments.filter((a) => isManager || (!!userId && a.uploaded_by === userId));
  const fixed = attachments.filter((a) => !removable.includes(a));

  const onRemove = async (a: Attachment) => {
    const ok = await confirm({
      title: t("removePhotoTitle"),
      description: t("removePhotoBody"),
      confirmLabel: tc("actions.remove"),
      cancelLabel: tc("actions.cancel"),
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(a.id, {
      onSuccess: () => toast.success(t("photoRemoved")),
      onError: (e) => toast.error(errorText(e)),
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const file_id of fileIds) {
        await add.mutateAsync({ panelId: issue.panel_id, body: { file_id, issue_id: issue.id } });
      }
      toast.success(t("photosAdded"));
      setAdding(false);
      setFileIds([]);
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title={t("photos")}
        actions={
          canAdd &&
          !adding && (
            <Button size="sm" onClick={() => setAdding(true)}>
              <ImagePlus />
              {t("addPhoto")}
            </Button>
          )
        }
      />
      <CardBody className="flex flex-col gap-4">
        {attachments.length === 0 && !adding && (
          <p className="text-sm text-muted">{t("noPhotos")}</p>
        )}
        {removable.length > 0 && <AttachmentGallery attachments={removable} onRemove={onRemove} />}
        {fixed.length > 0 && <AttachmentGallery attachments={fixed} />}
        {adding && (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border-strong p-3">
            <PhotoUploader onChange={setFileIds} onBusyChange={setBusy} />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setAdding(false);
                  setFileIds([]);
                }}
              >
                {tc("actions.cancel")}
              </Button>
              <Button
                variant="primary"
                loading={saving}
                disabled={busy || fileIds.length === 0}
                onClick={() => void save()}
              >
                {t("savePhotos", { count: fileIds.length })}
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
