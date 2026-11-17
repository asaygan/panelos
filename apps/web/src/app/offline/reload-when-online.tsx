"use client";

import { useEffect } from "react";

/** Return to where the user was as soon as the connection is back. */
export function ReloadWhenOnline() {
  useEffect(() => {
    const back = () => window.location.reload();
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, []);
  return null;
}
