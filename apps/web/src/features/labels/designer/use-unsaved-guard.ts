"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/components/ui/confirm";

/** Confirm before the tab closes or an in-app link leaves the page while edits are unsaved. */
export function useUnsavedGuard(active: boolean) {
  const router = useRouter();
  const confirm = useConfirm();
  const t = useTranslations("common.states");

  React.useEffect(() => {
    if (!active) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const a = (e.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname && url.search === window.location.search)
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      void confirm({
        title: t("unsavedTitle"),
        description: t("unsavedBody"),
        confirmLabel: t("unsavedDiscard"),
        cancelLabel: t("unsavedKeep"),
        destructive: true,
      }).then((ok) => {
        if (ok) router.push(url.pathname + url.search + url.hash);
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, confirm, router, t]);
}
