"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Btn } from "@/components/primitives/button";
import { Select } from "@/components/primitives/select";
import { Modal } from "@/components/primitives/modal";
import { Input } from "@/components/primitives/input";
import { Field } from "@/components/primitives/field";
import { Menu } from "@/components/primitives/menu";
import { BlueprintPlaceholder } from "./blueprint-placeholder";
import {
  usePanelRevisions,
  usePanelSheetFiles,
  useRenameSheet,
  useDeleteSheet,
  type SheetFileView,
} from "@/lib/query/hooks";
import type { Panel } from "@/lib/api/types";

export interface SchematicViewerProps {
  panelId: string;
  panel?: Panel;
  embedded?: boolean;
}

/** Shared, cached react-pdf module loader (worker configured once). */
type PdfModule = typeof import("react-pdf");
let pdfModPromise: Promise<PdfModule> | null = null;
function loadPdf(): Promise<PdfModule> {
  if (!pdfModPromise) {
    pdfModPromise = import("react-pdf").then((m) => {
      m.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${m.pdfjs.version}/build/pdf.worker.min.mjs`;
      return m;
    });
  }
  return pdfModPromise;
}

export function SchematicViewer({ panelId, panel }: SchematicViewerProps) {
  const { data: revisions = [] } = usePanelRevisions(panelId);
  const [revId, setRevId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!revId && revisions.length > 0) setRevId(revisions[0]!.id);
  }, [revisions, revId]);

  const { data: sheets = [] } = usePanelSheetFiles(panelId, revId);
  const rename = useRenameSheet(panelId);
  const del = useDeleteSheet(panelId);

  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(100); // 100% == fit to container width
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [editing, setEditing] = useState<SheetFileView | null>(null);
  const [confirmDel, setConfirmDel] = useState<SheetFileView | null>(null);

  // Measure the canvas area so 100% fits the available width.
  const stageRef = useRef<HTMLDivElement>(null);
  const [fitW, setFitW] = useState(620);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setFitW(Math.max(240, el.clientWidth - 48));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sheet = sheets[active] ?? sheets[0];
  const revLetter = useMemo(
    () => revisions.find((r) => r.id === revId)?.rev ?? panel?.rev ?? "—",
    [revisions, revId, panel],
  );

  useEffect(() => {
    setPage(1);
    setNumPages(1);
  }, [active, revId]);
  useEffect(() => {
    if (active > sheets.length - 1) setActive(0);
  }, [sheets.length, active]);

  const goPrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const goNext = useCallback(() => setPage((p) => Math.min(numPages, p + 1)), [numPages]);

  // Mouse wheel over the stage flips ONE page per gesture (cooldown-gated).
  useEffect(() => {
    const el = stageRef.current;
    if (!el || numPages <= 1) return;
    let locked = false;
    let unlockTimer: ReturnType<typeof setTimeout> | null = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < 4) return; // ignore tiny jitter
      // Re-arm the quiet-window on EVERY event so a continuous scroll counts once.
      if (unlockTimer) clearTimeout(unlockTimer);
      unlockTimer = setTimeout(() => {
        locked = false;
      }, 220);
      if (locked) return; // already flipped for this gesture
      locked = true;
      const dir = e.deltaY > 0 ? 1 : -1;
      setPage((p) => Math.min(numPages, Math.max(1, p + dir)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (unlockTimer) clearTimeout(unlockTimer);
    };
  }, [numPages]);

  if (sheets.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <ViewerToolbar revisions={revisions} revId={revId} onRev={setRevId} sheetLabel="No sheets" />
        <div
          style={{
            flex: 1,
            display: "grid",
            placeItems: "center",
            color: "var(--c-ink-3)",
            fontSize: "var(--fz-sm)",
            background: "var(--c-surface-3)",
          }}
        >
          No schematics on this revision.
        </div>
      </div>
    );
  }

  const pdfUrl = sheet?.key && sheet.key.length > 0 ? sheet.key : null;
  const pageWidth = (fitW * zoom) / 100;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
      {/* thumbnails */}
      <div
        style={{
          width: 172,
          flex: "none",
          borderRight: "1px solid var(--c-line)",
          overflow: "auto",
          background: "var(--c-surface-2)",
          padding: 8,
        }}
      >
        {sheets.map((s, i) => (
          <div key={s.id} style={{ marginBottom: 8, position: "relative" }}>
            <div onClick={() => setActive(i)} style={{ cursor: "pointer" }}>
              <div
                style={{
                  borderRadius: "var(--r-sm)",
                  border:
                    i === active ? "2px solid var(--c-accent)" : "1px solid var(--c-line-strong)",
                  background: "#fff",
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  minHeight: 96,
                  position: "relative",
                }}
              >
                <PdfThumb url={s.key} width={148} />
                <span
                  className="mono"
                  style={{
                    position: "absolute",
                    top: 3,
                    left: 4,
                    fontSize: 8.5,
                    color: "var(--c-ink-2)",
                    background: "rgba(255,255,255,.8)",
                    padding: "0 3px",
                    borderRadius: 2,
                  }}
                >
                  SHT {s.n}
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: i === active ? "var(--c-ink)" : "var(--c-ink-3)",
                  marginTop: 3,
                  fontWeight: i === active ? 600 : 400,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  paddingRight: 18,
                }}
              >
                {s.n} · {s.title}
              </div>
            </div>
            <div style={{ position: "absolute", top: 2, right: 2 }}>
              <Menu
                align="end"
                trigger={<Btn icon="more-horizontal" variant="ghost" size="sm" />}
                items={[
                  { label: "Rename", icon: "pencil", onClick: () => setEditing(s) },
                  { sep: true },
                  { label: "Delete sheet", icon: "x", danger: true, onClick: () => setConfirmDel(s) },
                ]}
              />
            </div>
          </div>
        ))}
      </div>

      {/* canvas */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <ViewerToolbar
          revisions={revisions}
          revId={revId}
          onRev={setRevId}
          sheetLabel={sheet ? `Sheet ${sheet.n}` : ""}
          sheetTitle={sheet?.title}
          page={page}
          numPages={numPages}
          onPrev={goPrev}
          onNext={goNext}
          zoom={zoom}
          onZoomOut={() => setZoom((z) => Math.max(50, z - 10))}
          onZoomIn={() => setZoom((z) => Math.min(300, z + 10))}
          onFit={() => setZoom(100)}
          downloadUrl={pdfUrl}
        />
        <div
          ref={stageRef}
          style={{
            flex: 1,
            overflow: "auto",
            background: "var(--c-surface-3)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: 24,
          }}
        >
          {pdfUrl ? (
            <PdfCanvas url={pdfUrl} page={page} width={pageWidth} onNumPages={setNumPages} />
          ) : (
            <BlueprintPlaceholder
              sheetNumber={sheet?.n ?? "—"}
              title={sheet?.title ?? ""}
              rev={revLetter}
              panelName={panel?.name}
              totalSheets={sheets.length}
              width={pageWidth}
            />
          )}
        </div>
      </div>

      {editing && (
        <RenameSheetModal
          sheet={editing}
          busy={rename.isPending}
          onClose={() => setEditing(null)}
          onSave={async (sheet_number, sheet_title) => {
            await rename.mutateAsync({ sheetId: editing.id, body: { sheet_number, sheet_title } });
            setEditing(null);
          }}
        />
      )}

      {confirmDel && (
        <Modal
          open
          onOpenChange={(o) => !o && setConfirmDel(null)}
          title="Delete sheet"
          sub={`${confirmDel.n} · ${confirmDel.title}`}
          width={420}
          footer={
            <>
              <Btn onClick={() => setConfirmDel(null)} disabled={del.isPending}>
                Cancel
              </Btn>
              <Btn
                variant="danger"
                icon="x"
                disabled={del.isPending}
                onClick={async () => {
                  await del.mutateAsync(confirmDel.id);
                  if (active > 0) setActive((a) => a - 1);
                  setConfirmDel(null);
                }}
              >
                {del.isPending ? "Deleting…" : "Delete sheet"}
              </Btn>
            </>
          }
        >
          <div style={{ fontSize: 13, color: "var(--c-ink-2)", lineHeight: 1.5 }}>
            This removes the sheet from this revision. The underlying file is kept. This cannot be
            undone.
          </div>
        </Modal>
      )}
    </div>
  );
}

interface ToolbarProps {
  revisions: { id: string; rev: string; status: string }[];
  revId?: string;
  onRev: (id: string) => void;
  sheetLabel: string;
  sheetTitle?: string;
  page?: number;
  numPages?: number;
  onPrev?: () => void;
  onNext?: () => void;
  zoom?: number;
  onZoomOut?: () => void;
  onZoomIn?: () => void;
  onFit?: () => void;
  downloadUrl?: string | null;
}

function ViewerToolbar({
  revisions,
  revId,
  onRev,
  sheetLabel,
  sheetTitle,
  page,
  numPages = 1,
  onPrev,
  onNext,
  zoom,
  onZoomOut,
  onZoomIn,
  onFit,
  downloadUrl,
}: ToolbarProps) {
  return (
    <div
      style={{
        height: 40,
        flex: "none",
        borderBottom: "1px solid var(--c-line)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 10px",
        background: "var(--c-surface)",
      }}
    >
      <span style={{ fontSize: "var(--fz-sm)", fontWeight: 600 }}>{sheetLabel}</span>
      {sheetTitle && (
        <span style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-3)" }}>{sheetTitle}</span>
      )}

      {numPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            marginLeft: 6,
            border: "1px solid var(--c-line-strong)",
            borderRadius: "var(--r-sm)",
          }}
          title="Scroll to change pages"
        >
          <Btn icon="chevron-left" variant="ghost" size="sm" disabled={page === 1} onClick={onPrev} />
          <span
            className="mono"
            style={{ fontSize: 11, minWidth: 54, textAlign: "center", color: "var(--c-ink-2)" }}
          >
            {page} / {numPages}
          </span>
          <Btn
            icon="chevron-right"
            variant="ghost"
            size="sm"
            disabled={page === numPages}
            onClick={onNext}
          />
        </div>
      )}

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
        <Select
          className="btn-sm"
          style={{ width: "auto", height: 26 }}
          value={revId ?? ""}
          onChange={(e) => onRev(e.target.value)}
        >
          {revisions.length === 0 && <option value="">Rev —</option>}
          {revisions.map((r) => (
            <option key={r.id} value={r.id}>
              Rev {r.rev}
              {r.status === "draft" ? " (draft)" : r.status === "review" ? " (review)" : ""}
            </option>
          ))}
        </Select>

        {zoom !== undefined && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid var(--c-line-strong)",
              borderRadius: "var(--r-sm)",
            }}
          >
            <Btn icon="zoom-out" variant="ghost" size="sm" onClick={onZoomOut} />
            <span
              onClick={onFit}
              title="Reset to fit"
              className="mono"
              style={{
                fontSize: 11,
                width: 40,
                textAlign: "center",
                color: "var(--c-ink-2)",
                cursor: "pointer",
              }}
            >
              {zoom}%
            </span>
            <Btn icon="zoom-in" variant="ghost" size="sm" onClick={onZoomIn} />
          </div>
        )}
        {downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noreferrer">
            <Btn icon="download" variant="ghost" size="sm" />
          </a>
        )}
      </div>
    </div>
  );
}

function RenameSheetModal({
  sheet,
  busy,
  onClose,
  onSave,
}: {
  sheet: SheetFileView;
  busy: boolean;
  onClose: () => void;
  onSave: (sheetNumber: string, sheetTitle: string) => void;
}) {
  const [n, setN] = useState(sheet.n);
  const [title, setTitle] = useState(sheet.title);
  return (
    <Modal
      open
      onOpenChange={(o) => !o && onClose()}
      title="Rename sheet"
      width={420}
      footer={
        <>
          <Btn onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon="check"
            disabled={busy || !title.trim()}
            onClick={() => onSave(n.trim(), title.trim())}
          >
            {busy ? "Saving…" : "Save"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
        <Field label="Sheet #">
          <Input value={n} onChange={(e) => setN(e.target.value)} placeholder="003" />
        </Field>
        <Field label="Sheet title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Single-Line Diagram"
          />
        </Field>
      </div>
    </Modal>
  );
}

/** Small first-page thumbnail rendered from the real PDF. */
function PdfThumb({ url, width }: { url: string; width: number }) {
  const [mod, setMod] = useState<PdfModule | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPdf()
      .then((m) => alive && setMod(m))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  if (!url || failed) {
    return (
      <div
        className="blueprint"
        style={{ width: "100%", aspectRatio: "1.3", borderRadius: "var(--r-xs)" }}
      />
    );
  }
  if (!mod) {
    return <div style={{ width: "100%", aspectRatio: "1.3", background: "var(--c-surface-3)" }} />;
  }
  const { Document, Page: PdfPage } = mod;
  return (
    <Document file={url} loading={<div style={{ height: 90 }} />} error={<div style={{ height: 90 }} />}>
      <PdfPage pageNumber={1} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
    </Document>
  );
}

/** Lazily-loaded react-pdf canvas for the active sheet/page. */
function PdfCanvas({
  url,
  page,
  width,
  onNumPages,
}: {
  url: string;
  page: number;
  width: number;
  onNumPages: (n: number) => void;
}) {
  const [mod, setMod] = useState<PdfModule | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPdf()
      .then((m) => alive && setMod(m))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div style={{ color: "var(--c-ink-3)", fontSize: "var(--fz-sm)" }}>
        Could not load the PDF viewer.{" "}
        <a href={url} target="_blank" rel="noreferrer">
          Open file
        </a>
      </div>
    );
  }
  if (!mod) {
    return <div style={{ color: "var(--c-ink-3)", fontSize: "var(--fz-sm)" }}>Loading sheet…</div>;
  }

  const { Document, Page: PdfPage } = mod;
  return (
    <Document
      file={url}
      loading={<div style={{ color: "var(--c-ink-3)" }}>Loading sheet…</div>}
      onLoadSuccess={(pdf: { numPages: number }) => onNumPages(pdf.numPages)}
      error={<div style={{ color: "var(--c-fault)" }}>Failed to load PDF file.</div>}
    >
      <PdfPage
        pageNumber={page}
        width={width}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
    </Document>
  );
}
