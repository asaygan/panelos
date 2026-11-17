import { z } from "zod";
import type { GroupType, LifecycleStatus } from "@/data/types";

/** Radix Select cannot hold an empty value: this stands for "none". */
export const NONE = "__none__";

export const LIFECYCLES: LifecycleStatus[] = [
  "draft",
  "engineering",
  "released",
  "installed",
  "commissioned",
  "in_service",
  "archived",
];
export const GROUP_TYPES: GroupType[] = ["mcc", "lvdp", "mv", "plc", "pfc", "ups", "scada", "dcs", "custom"];

export interface Messages {
  required: string;
  tooLong: string;
}

/** Empty / whitespace-only input becomes null for the API. */
export const nn = (s: string | undefined | null): string | null => s?.trim() || null;

const text = (m: Messages, max: number) => z.string().trim().max(max, m.tooLong);
const required = (m: Messages, max: number) => z.string().trim().min(1, m.required).max(max, m.tooLong);

export const projectSchema = (m: Messages) =>
  z.object({
    name: required(m, 200),
    code: text(m, 40),
    customer: text(m, 200),
    site: text(m, 200),
    description: text(m, 2000),
    location_id: z.string(),
    lifecycle_status: z.enum(LIFECYCLES as [LifecycleStatus, ...LifecycleStatus[]]),
  });
export type ProjectValues = z.infer<ReturnType<typeof projectSchema>>;

export const groupSchema = (m: Messages) =>
  z.object({
    name: required(m, 200),
    code: text(m, 40),
    group_type: z.enum(GROUP_TYPES as [GroupType, ...GroupType[]]),
    lifecycle_status: z.enum(LIFECYCLES as [LifecycleStatus, ...LifecycleStatus[]]),
    description: text(m, 2000),
  });
export type GroupValues = z.infer<ReturnType<typeof groupSchema>>;

export const cabinetSchema = (m: Messages) =>
  z.object({
    name: required(m, 200),
    code: text(m, 40),
    notes: text(m, 2000),
  });
export type CabinetValues = z.infer<ReturnType<typeof cabinetSchema>>;

export const panelSchema = (m: Messages, creating: boolean) =>
  z.object({
    name: required(m, 200),
    tag: creating ? text(m, 40) : required(m, 40),
    serial: text(m, 80),
    project_id: z.string(),
    system_group_id: z.string(),
    location_id: z.string(),
    area: text(m, 120),
    voltage: text(m, 40),
    current_a: text(m, 40),
    phase: text(m, 40),
    mfr: text(m, 120),
    customer: text(m, 200),
    enclosure: text(m, 80),
    ip_class: text(m, 20),
    installed_at: z.string(),
    notes: text(m, 2000),
  });
export type PanelValues = z.infer<ReturnType<typeof panelSchema>>;
