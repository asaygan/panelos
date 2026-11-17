"use client";

import * as React from "react";

/** Ask the browser to confirm a tab close / reload while edits are unsaved. */
export function useBeforeUnload(active: boolean) {
  React.useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [active]);
}
