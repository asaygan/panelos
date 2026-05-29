import QRCode from "qrcode";

export interface QrMatrix {
  size: number;
  /** Row-major booleans; module[i] = data[i] dark? */
  get: (row: number, col: number) => boolean;
}

/**
 * Compute the QR module matrix for a URL using error-correction level "M",
 * matching the rendering contract. Returns a 1×1 dark matrix for empty input.
 */
export function qrMatrix(value: string): QrMatrix {
  if (!value) {
    return { size: 1, get: () => false };
  }
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  return {
    size,
    get: (row: number, col: number) => data[row * size + col] === 1,
  };
}
