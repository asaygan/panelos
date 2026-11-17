"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";

/** Route-level error boundary: a failed page never leaves a blank screen. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-1 items-center justify-center bg-background">
      <ErrorState
        title={t("pages.errorTitle")}
        description={
          <>
            {t("pages.errorBody")}
            {error.digest && (
              <span className="mt-2 block font-mono text-xs text-subtle">
                {t("pages.errorRef", { id: error.digest })}
              </span>
            )}
          </>
        }
        action={
          <div className="flex gap-2">
            <Button variant="primary" onClick={reset}>
              {t("actions.retry")}
            </Button>
            <Button asChild>
              <Link href="/dashboard">{t("pages.home")}</Link>
            </Button>
          </div>
        }
      />
    </div>
  );
}
