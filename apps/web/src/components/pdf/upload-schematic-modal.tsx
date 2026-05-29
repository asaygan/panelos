"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import { Modal } from "@/components/primitives/modal";
import { Btn } from "@/components/primitives/button";
import { Field } from "@/components/primitives/field";
import { Input } from "@/components/primitives/input";
import { Icon } from "@/components/icons/icon";
import { files as filesApi } from "@/lib/api/endpoints";
import { usePresignUpload, useAttachSheet } from "@/lib/query/hooks";
import { panels as panelsApi, revisions as revisionsApi } from "@/lib/api/endpoints";

export interface UploadSchematicModalProps {
  panelId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_MB = 50;

async function ensureDraftRevision(panelId: string): Promise<string> {
  const revs = await panelsApi.revisions(panelId);
  const draft = revs.find((r) => r.status === "draft");
  if (draft) return draft.id;
  const created = await revisionsApi.create(panelId, "Schematic upload");
  return created.id;
}

/** Force the PUT through the same-origin Next proxy to dodge cross-origin/CORS. */
function toSameOrigin(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname + u.search; // e.g. /api/v1/files/upload/...
  } catch {
    return url;
  }
}

/** PUT with real upload progress via XHR (fetch can't report progress). */
function putWithProgress(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("network error during upload"));
    xhr.send(file);
  });
}

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Strip extension + tidy a filename into a human sheet title. */
function titleFromFilename(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

export function UploadSchematicModal({ panelId, open, onOpenChange }: UploadSchematicModalProps) {
  const presign = usePresignUpload();
  const attach = useAttachSheet();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sheetNumber, setSheetNumber] = useState("");
  const [sheetTitle, setSheetTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [done, setDone] = useState(false);
  const [doneName, setDoneName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setSheetNumber("");
    setSheetTitle("");
    setDragOver(false);
    setProgress(0);
    setStage("");
    setDone(false);
    setDoneName("");
    setError(null);
  };

  const accept = useCallback((f: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is larger than ${MAX_MB} MB.`);
      return;
    }
    setError(null);
    setFile(f);
    setSheetTitle((t) => t || titleFromFilename(f.name));
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    accept(e.dataTransfer.files?.[0] ?? null);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setProgress(0);
    try {
      setStage("Preparing…");
      const contentType = file.type || "application/pdf";
      const presigned = await presign.mutateAsync({ filename: file.name, contentType });

      setStage("Uploading…");
      await putWithProgress(toSameOrigin(presigned.url), file, contentType, setProgress);

      setStage("Finalizing…");
      const finalized = await filesApi.finalize({
        key: presigned.key,
        byte_size: file.size,
        original_filename: file.name,
      });

      setStage("Attaching to revision…");
      const revisionId = await ensureDraftRevision(panelId);
      await attach.mutateAsync({
        panelId,
        revisionId,
        body: {
          file_id: finalized.id,
          sheet_number: sheetNumber.trim() || "—",
          sheet_title: sheetTitle.trim() || titleFromFilename(file.name),
          page_index: 0,
        },
      });

      setStage("Done");
      setProgress(100);
      setDoneName(sheetTitle.trim() || titleFromFilename(file.name));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Check the file and retry.");
      setStage("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title={done ? "Upload complete" : "Upload schematic"}
      sub={done ? "Sheet attached — opening in the viewer" : "Drop a PDF sheet — it attaches to the panel's draft revision"}
      width={520}
      footer={
        done ? (
          <Btn variant="primary" icon="check" onClick={() => onOpenChange(false)}>
            OK
          </Btn>
        ) : (
          <>
            <Btn onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Btn>
            <Btn variant="primary" icon="upload" disabled={!file || busy} onClick={submit}>
              {busy ? stage || "Uploading…" : "Upload & attach"}
            </Btn>
          </>
        )
      }
    >
      {done ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "28px 20px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "var(--c-ok-soft)",
              color: "var(--c-ok)",
              border: "1px solid var(--c-ok-line)",
            }}
          >
            <Icon name="check" size={24} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 640, color: "var(--c-ink)" }}>
            Schematic uploaded
          </div>
          <div style={{ fontSize: 12, color: "var(--c-ink-3)" }}>
            <span style={{ fontWeight: 600, color: "var(--c-ink-2)" }}>{doneName}</span> attached to the
            draft revision. Press OK to view it.
          </div>
        </div>
      ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              fontSize: 12,
              color: "var(--c-fault)",
              background: "var(--c-fault-soft)",
              border: "1px solid var(--c-fault-line)",
              borderRadius: "var(--r-sm)",
              padding: "8px 10px",
            }}
          >
            <Icon name="alert-triangle" size={14} />
            {error}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          style={{ display: "none" }}
          onChange={(e) => accept(e.target.files?.[0] ?? null)}
        />

        {!file ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "36px 20px",
              textAlign: "center",
              cursor: "pointer",
              borderRadius: "var(--r-md)",
              border: `1.5px dashed ${dragOver ? "var(--c-accent)" : "var(--c-line-strong)"}`,
              background: dragOver ? "var(--c-accent-soft)" : "var(--c-surface-2)",
              transition: "background .12s, border-color .12s",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "var(--r-md)",
                display: "grid",
                placeItems: "center",
                background: dragOver ? "var(--c-accent)" : "var(--c-surface-3)",
                color: dragOver ? "#fff" : "var(--c-ink-3)",
                transition: "background .12s, color .12s",
              }}
            >
              <Icon name="upload" size={20} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-ink)" }}>
              {dragOver ? "Drop to upload" : "Drag & drop a PDF here"}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--c-ink-3)" }}>
              or <span style={{ color: "var(--c-accent-ink)", fontWeight: 600 }}>browse files</span> ·
              PDF up to {MAX_MB} MB
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "11px 12px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--c-line-strong)",
              background: "var(--c-surface-2)",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--r-sm)",
                flex: "none",
                display: "grid",
                placeItems: "center",
                background: "var(--c-accent-soft)",
                color: "var(--c-accent-ink)",
              }}
            >
              <Icon name="file-text" size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--c-ink)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {file.name}
              </div>
              <div className="mono" style={{ fontSize: 11, color: "var(--c-ink-3)" }}>
                {prettySize(file.size)} · PDF
              </div>
            </div>
            <Btn
              icon="x"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
          </div>
        )}

        {busy && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: "var(--c-ink-3)",
              }}
            >
              <span>{stage || "Working…"}</span>
              <span className="mono">{progress}%</span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--c-surface-3)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "var(--c-accent)",
                  borderRadius: 3,
                  transition: "width .15s ease",
                }}
              />
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
          <Field label="Sheet # (optional)">
            <Input
              value={sheetNumber}
              onChange={(e) => setSheetNumber(e.target.value)}
              placeholder="003"
            />
          </Field>
          <Field label="Sheet title">
            <Input
              value={sheetTitle}
              onChange={(e) => setSheetTitle(e.target.value)}
              placeholder="Single-Line Diagram"
            />
          </Field>
        </div>
      </div>
      )}
    </Modal>
  );
}
