"use client";

import { useTranslations } from "next-intl";
import { ApiError } from "@/lib/api/errors";

/**
 * Turn any thrown value into a message in the user's language.
 *
 *   const errorText = useApiError();
 *   mutation.mutate(x, { onError: (e) => toast.error(errorText(e)) });
 *
 * The API sends a stable `code` with every error; unknown codes fall back to a
 * generic message rather than leaking raw English/technical text.
 */
export function useApiError() {
  const t = useTranslations("errors");
  return (error: unknown): string => {
    const code = error instanceof ApiError ? error.code : "unknown";
    return t.has(code as never) ? t(code as never) : t("unknown");
  };
}

/** The API error code of a thrown value ("unknown" when it isn't an API error). */
export function errorCode(error: unknown): string {
  return error instanceof ApiError ? error.code : "unknown";
}
