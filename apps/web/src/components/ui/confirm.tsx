"use client";

import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "./button";

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** Red confirm button for destructive actions. */
  destructive?: boolean;
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = React.createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * Promise-based confirmation dialog (replaces window.confirm):
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title, confirmLabel, cancelLabel, destructive: true })) { ... }
 */
export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<Resolver | null>(null);

  const confirm = React.useCallback((o: ConfirmOptions) => {
    setOptions(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-[60] bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-5 shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            <AlertDialog.Title className="text-lg font-semibold">{options?.title}</AlertDialog.Title>
            <AlertDialog.Description asChild>
              <div className="mt-2 text-sm text-muted">{options?.description ?? options?.title}</div>
            </AlertDialog.Description>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel asChild>
                <Button variant="secondary">{options?.cancelLabel}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  variant={options?.destructive ? "danger" : "primary"}
                  onClick={() => settle(true)}
                >
                  {options?.confirmLabel}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}
