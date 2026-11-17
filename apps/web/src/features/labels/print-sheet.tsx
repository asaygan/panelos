"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { LabelData, LabelLayout } from "@/lib/api/label-layout";
import { LabelSvg } from "./label-svg";

export interface PrintItem {
  layout: LabelLayout;
  data: LabelData;
}

// Hides the whole app while the browser prints, leaving only the label sheet.
const PRINT_CSS =
  "@media print { body > *:not([data-label-print]) { display: none !important; } @page { margin: 0; } }";

/**
 * Print labels at their real size straight from the browser (any count, any
 * template). `node` must be rendered once by the caller.
 */
export function usePrintLabels() {
  const [items, setItems] = React.useState<PrintItem[] | null>(null);

  const print = React.useCallback((next: PrintItem[]) => {
    if (next.length > 0) setItems(next);
  }, []);

  React.useEffect(() => {
    if (!items) return;
    const done = () => setItems(null);
    window.addEventListener("afterprint", done);
    // two frames: let the sheet mount and the logo image decode first
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", done);
    };
  }, [items]);

  const node =
    items && typeof document !== "undefined"
      ? createPortal(
          <div
            data-label-print
            className="hidden flex-wrap content-start gap-[3mm] bg-white p-[5mm] print:flex"
          >
            <style>{PRINT_CSS}</style>
            {items.map((item, i) => (
              <div key={i} className="break-inside-avoid">
                <LabelSvg layout={item.layout} data={item.data} physical />
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return { print, node, printing: items !== null };
}
