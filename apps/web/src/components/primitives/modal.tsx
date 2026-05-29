"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Btn } from "./button";

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  sub?: ReactNode;
  footer?: ReactNode;
  width?: number;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, title, sub, footer, width = 480, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content
          className="modal"
          style={{
            width,
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 300,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: "1px solid var(--c-line)",
            }}
          >
            <div>
              <Dialog.Title style={{ fontSize: 14, fontWeight: 660, margin: 0 }}>{title}</Dialog.Title>
              {sub && (
                <Dialog.Description
                  style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-3)", marginTop: 2 }}
                >
                  {sub}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Btn icon="x" variant="ghost" size="sm" />
            </Dialog.Close>
          </div>
          <div style={{ padding: 16, overflow: "auto" }}>{children}</div>
          {footer && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                padding: "12px 16px",
                borderTop: "1px solid var(--c-line)",
              }}
            >
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
