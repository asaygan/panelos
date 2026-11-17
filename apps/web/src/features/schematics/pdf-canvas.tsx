"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Skeleton } from "@/components/ui/feedback";

// The worker is self-hosted (no CDN). public/pdf.worker.min.mjs is a copy of
// node_modules/pdfjs-dist/build/pdf.worker.min.mjs and MUST be re-copied
// whenever pdfjs-dist is upgraded, or the viewer breaks on a version mismatch.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export interface PdfCanvasProps {
  url: string;
  pageNumber: number;
  /** Rendered width in CSS pixels. */
  width: number;
  onLoaded: (numPages: number) => void;
  onError: () => void;
}

/** One PDF page, canvas only (text and annotation layers are off for speed). */
export default function PdfCanvas({ url, pageNumber, width, onLoaded, onError }: PdfCanvasProps) {
  const file = React.useMemo(() => ({ url }), [url]);
  return (
    <Document
      file={file}
      onLoadSuccess={(pdf) => onLoaded(pdf.numPages)}
      onLoadError={onError}
      onSourceError={onError}
      loading={<Skeleton className="aspect-[1.414] w-full" />}
      error={null}
      noData={null}
    >
      <Page
        pageNumber={pageNumber}
        width={Math.max(width, 120)}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        loading={<Skeleton className="aspect-[1.414] w-full" />}
        onRenderError={onError}
        className="shadow-md"
      />
    </Document>
  );
}
