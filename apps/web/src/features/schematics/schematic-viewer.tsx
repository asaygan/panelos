"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { FileX2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/controls";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useFileUrl } from "@/data/hooks";
import type { Sheet } from "@/data/types";
import { cn } from "@/lib/utils/cn";
import { ViewerToolbar } from "./viewer-toolbar";

const PdfCanvas = dynamic(() => import("./pdf-canvas"), {
  ssr: false,
  loading: () => <Skeleton className="aspect-[1.414] w-full" />,
});

export interface SchematicViewerProps {
  sheets: Sheet[];
  /** Extra controls for the active sheet (edit / remove). */
  sheetActions?: (sheet: Sheet) => React.ReactNode;
  /** Shown in the empty state (e.g. an upload button). */
  emptyAction?: React.ReactNode;
}

/**
 * Sheet list + canvas + toolbar. Only the sheet being viewed has its signed
 * URL resolved and its PDF fetched. Load with next/dynamic (ssr: false) from
 * route files if you want to keep react-pdf out of the initial bundle.
 */
export function SchematicViewer({ sheets, sheetActions, emptyAction }: SchematicViewerProps) {
  const t = useTranslations("schematics.viewer");
  const tc = useTranslations("common.actions");
  const sorted = React.useMemo(
    () =>
      [...sheets].sort((a, b) =>
        a.sheet_number.localeCompare(b.sheet_number, undefined, { numeric: true }),
      ),
    [sheets],
  );
  const [activeId, setActiveId] = React.useState<string | undefined>();
  const active = sorted.find((s) => s.id === activeId) ?? sorted[0];
  const index = active ? sorted.indexOf(active) : -1;

  const [page, setPage] = React.useState(1);
  const [numPages, setNumPages] = React.useState(1);
  const [zoom, setZoom] = React.useState(1);
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const [fullscreen, setFullscreen] = React.useState(false);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = React.useState(0);

  const url = useFileUrl(active?.file_id);

  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setStageWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [active?.id]);

  React.useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const select = (id: string) => {
    setActiveId(id);
    setPage(1);
    setNumPages(1);
    setFailed(false);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
    void url.refetch();
  };

  if (!active) {
    return (
      <EmptyState
        icon={<FileX2 />}
        title={t("emptyTitle")}
        description={t("emptyDescription")}
        action={emptyAction}
      />
    );
  }

  const pdfWidth = Math.max(stageWidth - 24, 160) * zoom;

  return (
    <div
      ref={rootRef}
      className={cn(
        "flex min-h-0 flex-col bg-surface lg:flex-row",
        fullscreen && "h-dvh",
      )}
    >
      {/* Sheet list: sidebar on desktop, Select on phones */}
      <div className="border-b border-border p-2 lg:hidden">
        <Select
          aria-label={t("sheetSelect")}
          value={active.id}
          onValueChange={select}
          options={sorted.map((s) => ({ value: s.id, label: `${s.sheet_number} · ${s.sheet_title}` }))}
        />
      </div>
      <nav
        aria-label={t("sheetList")}
        className="scroll-thin hidden w-60 shrink-0 overflow-y-auto border-r border-border p-2 lg:block"
      >
        <p className="px-2 pb-1.5 text-xs font-medium uppercase tracking-wide text-subtle">
          {t("sheetCount", { count: sorted.length })}
        </p>
        <ul className="flex flex-col gap-0.5">
          {sorted.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => select(s.id)}
                aria-current={s.id === active.id ? "true" : undefined}
                className={cn(
                  "flex w-full flex-col rounded px-2 py-1.5 text-left hover:bg-surface-2",
                  s.id === active.id && "bg-primary-soft",
                )}
              >
                <span className="font-mono text-sm font-medium">{s.sheet_number}</span>
                <span className="truncate text-sm text-muted">{s.sheet_title}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <ViewerToolbar
          sheetIndex={index}
          sheetTotal={sorted.length}
          onSheet={(d) => select(sorted[index + d]!.id)}
          page={page}
          numPages={numPages}
          onPage={(d) => setPage((p) => Math.min(Math.max(p + d, 1), numPages))}
          zoom={zoom}
          onZoom={setZoom}
          fullscreen={fullscreen}
          onFullscreen={toggleFullscreen}
          url={url.data}
          extra={sheetActions?.(active)}
        />
        <div
          ref={stageRef}
          role="region"
          aria-label={t("canvas")}
          className={cn(
            "scroll-thin min-h-[320px] flex-1 overflow-auto bg-surface-3/60 p-3",
            fullscreen ? "" : "max-h-[75dvh]",
          )}
        >
          {url.isError || failed ? (
            <ErrorState
              title={t("loadErrorTitle")}
              description={t("loadErrorDescription")}
              action={<Button onClick={retry}>{tc("retry")}</Button>}
            />
          ) : !url.data || stageWidth === 0 ? (
            <Skeleton className="aspect-[1.414] w-full" />
          ) : (
            <div className="mx-auto w-fit">
              <PdfCanvas
                key={`${active.id}-${attempt}`}
                url={url.data}
                pageNumber={Math.min(page, numPages)}
                width={pdfWidth}
                onLoaded={setNumPages}
                onError={() => setFailed(true)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
