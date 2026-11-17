import { qrMatrix } from "@/lib/api/qr-matrix";

/**
 * Scannable QR code as crisp SVG. `value` is what a scanner reads: for a
 * panel always pass `scanUrl(panel.qr_token)` (never the serial or tag).
 */
export function QrCode({
  value,
  size = 128,
  className,
  title,
}: {
  value: string;
  size?: number;
  className?: string;
  title?: string;
}) {
  const matrix = qrMatrix(value);
  const n = matrix.size;
  const quiet = 2; // modules of white margin around the code
  const dim = n + quiet * 2;
  let path = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix.get(y, x)) path += `M${x + quiet} ${y + quiet}h1v1h-1z`;
    }
  }
  return (
    <svg
      viewBox={`0 0 ${dim} ${dim}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={title ?? "QR"}
      className={className}
    >
      <rect width={dim} height={dim} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
