"use client";

import { useEffect } from "react";
import { Btn } from "@/components/primitives/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 660, color: "var(--c-ink)" }}>Something went wrong</div>
      <div style={{ fontSize: 12, color: "var(--c-ink-3)", maxWidth: 420, textAlign: "center" }}>
        {error.message || "An unexpected error occurred."}
      </div>
      <Btn variant="primary" onClick={reset}>
        Try again
      </Btn>
    </div>
  );
}
