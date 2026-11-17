import { QrCode } from "@/components/domain/qr-code";

/** @deprecated legacy wrapper — use QrCode from components/domain/qr-code. */
export function QRGlyph({ value, size = 96 }: { value: string; size?: number; fg?: string; bg?: string; fallback?: boolean }) {
  return <QrCode value={value} size={size} />;
}
