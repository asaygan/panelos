"use client";

import * as React from "react";
import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/menu";
import type { LabelData, LabelLayout } from "@/lib/api/label-layout";
import { cn } from "@/lib/utils/cn";
import { LabelSvg } from "./label-svg";

const PX_PER_MM_AT_100 = 96 / 25.4;
const MIN_SCALE = 1;
const MAX_SCALE = 24;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Width of an element, kept current with a ResizeObserver. */
export function useElementWidth<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/**
 * The label on a work surface. Starts "zoomed to fit"; with `zoomable` the
 * user can zoom (100% = real size on screen) and snap back to fit.
 */
export function LabelPreview({
  layout,
  data,
  zoomable = false,
  maxHeightRatio = 0.5,
  className,
}: {
  layout: LabelLayout;
  data: LabelData;
  zoomable?: boolean;
  /** Fit never makes the label taller than this share of the window. */
  maxHeightRatio?: number;
  className?: string;
}) {
  const t = useTranslations("labels");
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [zoom, setZoom] = React.useState<number | null>(null);
  const [viewportH, setViewportH] = React.useState(800);
  const { w, h } = layout.size_mm;

  React.useEffect(() => {
    const update = () => setViewportH(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const fit = clamp(
    Math.min((width - 32) / w, (viewportH * maxHeightRatio) / h),
    MIN_SCALE,
    MAX_SCALE,
  );
  const scale = zoom ?? (width > 0 ? fit : 4);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        className="scroll-thin flex min-h-[12rem] overflow-auto rounded-lg border border-border bg-surface-3 p-4"
      >
        <div className="m-auto shrink-0 shadow-lg">
          <LabelSvg layout={layout} data={data} scale={scale} />
        </div>
      </div>
      {zoomable && (
        <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded border border-border bg-surface p-0.5 shadow-sm">
          <Tooltip label={t("preview.zoomOut")}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("preview.zoomOut")}
              onClick={() => setZoom(clamp(scale / 1.25, MIN_SCALE, MAX_SCALE))}
            >
              <ZoomOut />
            </Button>
          </Tooltip>
          <span className="w-11 text-center font-mono text-xs text-muted" aria-live="polite">
            {Math.round((scale / PX_PER_MM_AT_100) * 100)}%
          </span>
          <Tooltip label={t("preview.zoomIn")}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("preview.zoomIn")}
              onClick={() => setZoom(clamp(scale * 1.25, MIN_SCALE, MAX_SCALE))}
            >
              <ZoomIn />
            </Button>
          </Tooltip>
          <Tooltip label={t("preview.fit")}>
            <Button
              variant={zoom === null ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={t("preview.fit")}
              aria-pressed={zoom === null}
              onClick={() => setZoom(null)}
            >
              <Maximize2 />
            </Button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
