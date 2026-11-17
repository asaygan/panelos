"use client";

import { Toaster as Sonner, toast } from "sonner";

/** Mount once in the root layout. Use `toast.success()` / `toast.error()` anywhere. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-border !bg-surface !text-foreground !shadow-lg !font-sans",
          description: "!text-muted",
          error: "!border-danger/30",
          success: "!border-success/30",
        },
      }}
    />
  );
}

export { toast };
