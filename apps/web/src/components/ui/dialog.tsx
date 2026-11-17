"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const overlay =
  "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export interface DialogContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons row, right aligned (stacked full-width on phones). */
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  closeLabel?: string;
}

const sizes = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

/**
 * Centered modal on desktop, bottom sheet on phones. Title is required: it
 * names the dialog for screen readers.
 */
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, title, description, footer, size = "md", closeLabel = "Close", children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={overlay} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 flex max-h-[92dvh] w-full flex-col border border-border bg-surface shadow-lg outline-none",
        "inset-x-0 bottom-0 rounded-t-lg data-[state=open]:animate-slide-in-bottom",
        "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:data-[state=open]:animate-in sm:data-[state=open]:fade-in-0 sm:data-[state=open]:zoom-in-95",
        sizes[size],
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-sm text-muted">
              {description}
            </DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
        </div>
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="-mr-1.5 -mt-1 grid size-8 shrink-0 place-items-center rounded text-subtle hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <div className="safe-bottom flex flex-col-reverse gap-2 border-t border-border px-5 py-3 sm:flex-row sm:justify-end">
          {footer}
        </div>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";

export interface SheetContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width class for the panel on desktop. */
  widthClass?: string;
  closeLabel?: string;
}

/** Side panel (right) on desktop, full-height sheet on phones. Use with <Dialog>. */
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, title, description, footer, widthClass = "sm:max-w-md", closeLabel = "Close", children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className={overlay} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-surface shadow-lg outline-none data-[state=open]:animate-slide-in-right",
        widthClass,
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <DialogPrimitive.Title className="truncate text-lg font-semibold">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className={description ? "mt-1 text-sm text-muted" : "sr-only"}>
            {description ?? title}
          </DialogPrimitive.Description>
        </div>
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="-mr-1.5 -mt-1 grid size-8 shrink-0 place-items-center rounded text-subtle hover:bg-surface-2 hover:text-foreground"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <div className="safe-bottom flex justify-end gap-2 border-t border-border px-5 py-3">
          {footer}
        </div>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = "SheetContent";
