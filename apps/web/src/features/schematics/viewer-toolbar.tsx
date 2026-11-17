"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize,
  Minimize,
  MoveHorizontal,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/menu";

export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

function IconBtn({
  label,
  onClick,
  disabled,
  children,
  href,
  download,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  href?: string;
  download?: boolean;
}) {
  const btn = href ? (
    <Button asChild variant="ghost" size="icon-sm" aria-label={label}>
      <a href={href} target="_blank" rel="noreferrer" download={download || undefined}>
        {children}
      </a>
    </Button>
  ) : (
    <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
  return <Tooltip label={label}>{btn}</Tooltip>;
}

export interface ViewerToolbarProps {
  sheetIndex: number;
  sheetTotal: number;
  onSheet: (delta: number) => void;
  page: number;
  numPages: number;
  onPage: (delta: number) => void;
  zoom: number;
  onZoom: (next: number) => void;
  fullscreen: boolean;
  onFullscreen: () => void;
  url?: string;
  extra?: React.ReactNode;
}

export function ViewerToolbar(p: ViewerToolbarProps) {
  const t = useTranslations("schematics.viewer");
  const zi = ZOOM_STEPS.findIndex((z) => z >= p.zoom);
  const step = (dir: 1 | -1) =>
    p.onZoom(ZOOM_STEPS[Math.min(Math.max((zi < 0 ? ZOOM_STEPS.length - 1 : zi) + dir, 0), ZOOM_STEPS.length - 1)]!);
  const percent = Math.round(p.zoom * 100);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-1.5">
      <IconBtn label={t("prevSheet")} onClick={() => p.onSheet(-1)} disabled={p.sheetIndex <= 0}>
        <ChevronLeft />
      </IconBtn>
      <span className="font-tabular min-w-10 text-center text-sm text-muted">
        {p.sheetIndex + 1}/{p.sheetTotal}
      </span>
      <IconBtn
        label={t("nextSheet")}
        onClick={() => p.onSheet(1)}
        disabled={p.sheetIndex >= p.sheetTotal - 1}
      >
        <ChevronRight />
      </IconBtn>

      {p.numPages > 1 && (
        <div className="ml-2 flex items-center gap-1 border-l border-border pl-2">
          <IconBtn label={t("prevPage")} onClick={() => p.onPage(-1)} disabled={p.page <= 1}>
            <ChevronLeft />
          </IconBtn>
          <span className="font-tabular text-sm text-muted">
            {t("pageOf", { page: p.page, total: p.numPages })}
          </span>
          <IconBtn label={t("nextPage")} onClick={() => p.onPage(1)} disabled={p.page >= p.numPages}>
            <ChevronRight />
          </IconBtn>
        </div>
      )}

      <div className="ml-auto flex items-center gap-1">
        {p.extra}
        <IconBtn label={t("zoomOut")} onClick={() => step(-1)} disabled={p.zoom <= ZOOM_STEPS[0]!}>
          <ZoomOut />
        </IconBtn>
        <Tooltip label={t("resetZoom", { percent: 100 })}>
          <Button
            variant="ghost"
            size="sm"
            className="font-tabular min-w-12 px-1.5"
            aria-label={t("resetZoom", { percent: 100 })}
            onClick={() => p.onZoom(1)}
          >
            {percent}%
          </Button>
        </Tooltip>
        <IconBtn label={t("zoomIn")} onClick={() => step(1)} disabled={p.zoom >= ZOOM_STEPS.at(-1)!}>
          <ZoomIn />
        </IconBtn>
        <IconBtn label={t("fitWidth")} onClick={() => p.onZoom(1)}>
          <MoveHorizontal />
        </IconBtn>
        <IconBtn
          label={p.fullscreen ? t("exitFullscreen") : t("fullscreen")}
          onClick={p.onFullscreen}
        >
          {p.fullscreen ? <Minimize /> : <Maximize />}
        </IconBtn>
        {p.url && (
          <>
            <IconBtn label={t("openOriginal")} href={p.url}>
              <ExternalLink />
            </IconBtn>
            <IconBtn label={t("download")} href={p.url} download>
              <Download />
            </IconBtn>
          </>
        )}
      </div>
    </div>
  );
}
