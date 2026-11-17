"use client";

import * as React from "react";
import { ImageIcon, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { companyApi } from "@/data/api";
import { useUpdateCompany } from "@/data/hooks";
import type { Company } from "@/data/types";
import { uploadFile } from "@/data/upload";
import { useApiError } from "@/lib/use-api-error";

const ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp";
const MAX_MB = 5;

/** Logo preview + upload. Saves immediately (independent of the details form). */
export function LogoField({ company, readOnly }: { company: Company; readOnly: boolean }) {
  const t = useTranslations("settings.organization.logo");
  const errorText = useApiError();
  const update = useUpdateCompany();
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [broken, setBroken] = React.useState(false);

  React.useEffect(() => setBroken(false), [company.logo_key]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error(t("wrongType"));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(t("tooLarge", { max: MAX_MB }));
      return;
    }
    setBusy(true);
    try {
      const stored = await uploadFile(file);
      await update.mutateAsync({ logo_key: stored.storage_key });
      toast.success(t("updated"));
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const hasLogo = Boolean(company.logo_key) && !broken;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-surface-2">
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={companyApi.logoUrl(company.logo_key)}
            alt={t("alt", { name: company.name })}
            className="size-full object-contain p-1.5"
            onError={() => setBroken(true)}
          />
        ) : (
          <ImageIcon className="size-6 text-subtle" aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted">{t("hint", { max: MAX_MB })}</p>
        {!readOnly && (
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              ref={input}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-label={t("upload")}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <Button size="sm" loading={busy} onClick={() => input.current?.click()}>
              <Upload />
              {hasLogo ? t("replace") : t("upload")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
