export function formatDate(iso: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-CA", opts ?? { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function formatVoltage(voltage: number | string | null | undefined): string {
  if (voltage == null) return "—";
  const n = typeof voltage === "string" ? parseFloat(voltage) : voltage;
  if (Number.isNaN(n)) return String(voltage);
  if (n >= 1000) return `${(n / 1000).toFixed(1)}kV`;
  return `${n}V`;
}

/** Human-friendly relative time, e.g. "just now", "5m ago", "3d ago", or a date. */
export function relativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return "Never";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "Never";
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 0) return "just now";
  if (secs < 45) return "just now";
  if (secs < 90) return "1m ago";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  return formatDate(d);
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}
