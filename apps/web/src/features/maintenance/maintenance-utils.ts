import type { Maintenance } from "@/data/types";

export type Kind = Maintenance["kind"];
export type Result = Maintenance["result"];

export const KINDS = [
  "inspection",
  "preventive",
  "corrective",
  "thermography",
  "cleaning",
  "test",
  "other",
] as const satisfies readonly Kind[];
export const RESULTS = ["ok", "attention", "fail"] as const satisfies readonly Result[];

export const RESULT_DOT: Record<Result, string> = {
  ok: "bg-success",
  attention: "bg-warning",
  fail: "bg-danger",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Value for <input type="datetime-local"> in the user's local time. */
export function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Value for <input type="date"> in the user's local time. */
export function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}
