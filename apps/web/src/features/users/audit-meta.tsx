"use client";

import { useTranslations } from "next-intl";
import type { AuditLog } from "@/data/types";

type Row = { key: string; value: string };

function humanize(key: string) {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);
}

function flatten(
  obj: Record<string, unknown>,
  yes: string,
  no: string,
  out: Row[] = [],
): Row[] {
  for (const [key, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length) out.push({ key, value: v.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(", ") });
    } else if (typeof v === "object") flatten(v as Record<string, unknown>, yes, no, out);
    else if (typeof v === "boolean") out.push({ key, value: v ? yes : no });
    else out.push({ key, value: String(v) });
  }
  return out;
}

/** Readable key/value list of an audit entry's meta. */
export function AuditMeta({ meta }: { meta: AuditLog["meta"] }) {
  const t = useTranslations("users.audit");
  const tc = useTranslations("common");
  const rows = flatten(meta as Record<string, unknown>, tc("states.yes"), tc("states.no"));
  if (rows.length === 0) return <p className="text-sm text-muted">{t("noDetails")}</p>;
  return (
    <dl className="grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[minmax(8rem,12rem)_1fr]">
      {rows.map((r, i) => (
        <div key={`${r.key}-${i}`} className="contents">
          <dt className="text-subtle">{t.has(`meta.${r.key}` as never) ? t(`meta.${r.key}` as never) : humanize(r.key)}</dt>
          <dd className="min-w-0 break-words">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
