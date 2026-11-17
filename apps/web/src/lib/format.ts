"use client";

import { useFormatter, useNow, useTranslations } from "next-intl";

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Locale-aware formatting for the active language. Every function accepts
 * null/undefined and returns "—" so tables never show "Invalid Date".
 */
export function useFmt() {
  const f = useFormatter();
  const t = useTranslations("common.time");
  const now = useNow({ updateInterval: 60_000 });
  const dash = "—";

  return {
    /** 17 Kas 2026 */
    date: (v: DateInput) => {
      const d = toDate(v);
      return d ? f.dateTime(d, { day: "numeric", month: "short", year: "numeric" }) : dash;
    },
    /** 17 Kas 2026 14:32 */
    dateTime: (v: DateInput) => {
      const d = toDate(v);
      return d
        ? f.dateTime(d, {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : dash;
    },
    /** "3 saat önce"; falls back to a date after a month. */
    relative: (v: DateInput) => {
      const d = toDate(v);
      if (!d) return dash;
      const diff = Math.abs(now.getTime() - d.getTime());
      if (diff < 45_000) return t("justNow");
      if (diff > 30 * 86_400_000)
        return f.dateTime(d, { day: "numeric", month: "short", year: "numeric" });
      return f.relativeTime(d, now);
    },
    number: (v: number | null | undefined) => (v === null || v === undefined ? dash : f.number(v)),
    bytes: (v: number | null | undefined) => {
      if (v === null || v === undefined) return dash;
      if (v < 1024) return `${v} B`;
      if (v < 1024 * 1024) return `${f.number(v / 1024, { maximumFractionDigits: 0 })} KB`;
      return `${f.number(v / 1024 / 1024, { maximumFractionDigits: 1 })} MB`;
    },
    /** Whole days from today to an ISO date (negative = past). */
    daysUntil: (isoDate: string | null | undefined) => {
      const d = toDate(isoDate);
      if (!d) return null;
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      return Math.round((target - start) / 86_400_000);
    },
  };
}
