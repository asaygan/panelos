import { filesApi } from "./api";
import type { StoredFile } from "./types";

/**
 * Where to PUT an upload. Local dev presigns to the API's own /files/upload
 * route, which must go through the same-origin Next proxy. Cloud storage (S3)
 * presigns to its own host and must be used untouched.
 */
function uploadTarget(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.startsWith("/api/v1/files/upload/") ? u.pathname + u.search : url;
  } catch {
    return url;
  }
}

function put(
  url: string,
  file: Blob,
  headers: Record<string, string>,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload ${xhr.status}`));
    xhr.onerror = () => reject(new Error("upload network error"));
    xhr.send(file);
  });
}

export const MAX_UPLOAD_MB = 100;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload one file: presign → PUT straight to storage (with progress) →
 * finalize (the API verifies type/size and returns the stored file record).
 */
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<StoredFile> {
  const contentType = file.type || "application/octet-stream";
  const presigned = await filesApi.presign(file.name, contentType);
  await put(
    uploadTarget(presigned.url),
    file,
    presigned.headers ?? { "Content-Type": contentType },
    onProgress,
  );
  return filesApi.finalize(presigned.key, file.name);
}

/** Downscale a phone photo before upload (field connections are slow). */
export async function compressImage(file: File, maxSide = 2000, quality = 0.82): Promise<File> {
  if (!IMAGE_TYPES.includes(file.type) || typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
