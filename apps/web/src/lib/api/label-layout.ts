// Canonical Label Layout schema v2 — mirrors docs/design/label-layout-schema.md.
// Single source of truth for the web side; backend implements the same geometry.

import type { Panel } from "@/lib/api/types";

/** Minimal company shape needed for bindings (works for CompanyOut and view-model). */
export interface CompanyLike {
  name?: string | null;
  short_name?: string | null;
  standards_profile?: string | null;
}

// ── Constants (geometry contract) ─────────────────────────────────────────────
export const UNITS_PER_MM = 10;
export const PT_TO_U = 254 / 72; // ≈ 3.527778
/** mm → SVG user units. */
export const u = (mm: number): number => mm * UNITS_PER_MM;

// ── Element vocabulary ─────────────────────────────────────────────────────────
export type ElementType = "field" | "text" | "qr" | "logo" | "line" | "box";
export type FontKind = "sans" | "mono";
export type Align = "left" | "center" | "right";
export type FontWeight = 400 | 500 | 600 | 700 | 800;

export type Binding =
  | "tag"
  | "name"
  | "serial"
  | "rev"
  | "voltage"
  | "current"
  | "phase"
  | "mfr"
  | "enclosure"
  | "location"
  | "area"
  | "company"
  | "company_short"
  | "standards"
  | "scan_url";

export const BINDINGS: { value: Binding; label: string }[] = [
  { value: "tag", label: "Tag" },
  { value: "name", label: "Name" },
  { value: "serial", label: "Serial" },
  { value: "rev", label: "Revision" },
  { value: "voltage", label: "Voltage" },
  { value: "current", label: "Current" },
  { value: "phase", label: "Phase" },
  { value: "mfr", label: "Manufacturer" },
  { value: "enclosure", label: "Enclosure" },
  { value: "location", label: "Location" },
  { value: "area", label: "Area" },
  { value: "company", label: "Company" },
  { value: "company_short", label: "Company (short)" },
  { value: "standards", label: "Standards" },
  { value: "scan_url", label: "Scan URL" },
];

export interface ElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
  visible: boolean;
}

export interface TextLikeProps {
  font: FontKind;
  size_pt: number;
  weight: FontWeight;
  align: Align;
  color: string;
  uppercase?: boolean;
  letter_spacing?: number;
}

export interface FieldElement extends ElementBase, TextLikeProps {
  type: "field";
  binding: Binding;
}

export interface TextElement extends ElementBase, TextLikeProps {
  type: "text";
  text: string;
}

export interface QrElement extends ElementBase {
  type: "qr";
  binding: "scan_url";
  fg: string;
  bg: string;
  quiet: number;
}

export interface LogoElement extends ElementBase {
  type: "logo";
  source: "company" | "none";
  fit: "contain";
}

export interface LineElement extends ElementBase {
  type: "line";
  stroke: string;
  stroke_w: number;
}

export interface BoxElement extends ElementBase {
  type: "box";
  fill: string;
  stroke: string;
  stroke_w: number;
  radius: number;
}

export type LabelElement =
  | FieldElement
  | TextElement
  | QrElement
  | LogoElement
  | LineElement
  | BoxElement;

export type Orientation = "landscape" | "portrait";
export type BackgroundKind = "engraved" | "plain";

export interface LabelBackground {
  kind: BackgroundKind;
  fill: string;
  radius_mm: number;
}

export interface LabelLayout {
  version: 2;
  orientation: Orientation;
  size_mm: { w: number; h: number };
  background: LabelBackground;
  grid_mm: number;
  /** Editor-only: snap-to-grid/guides toggle. Renderers ignore this. */
  snap?: boolean;
  elements: LabelElement[];
}

// ── Binding data record ─────────────────────────────────────────────────────────
/** Flat record consumed by the renderer; built from a Panel + Company. */
export interface LabelData {
  tag: string;
  name: string;
  serial: string;
  rev: string;
  voltage: string;
  current: string;
  phase: string;
  mfr: string;
  enclosure: string;
  location: string;
  area: string;
  company: string;
  company_short: string;
  standards: string;
  scan_url: string;
  /** Optional company logo url (web) for logo elements. */
  logo_url?: string | null;
}

const STANDARDS_LABEL: Record<string, string> = {
  iec: "IEC 61439",
  ul: "UL 508A",
};

/** Build the flat binding record from a Panel + Company (+ app url). */
export function buildLabelData(
  panel: Panel | undefined,
  company: CompanyLike | undefined,
  opts: { appUrl?: string; logoUrl?: string | null } = {},
): LabelData {
  const appUrl = opts.appUrl ?? "";
  const token = panel?.qr_token ?? "";
  const standards = company?.standards_profile
    ? STANDARDS_LABEL[company.standards_profile] ?? company.standards_profile.toUpperCase()
    : "";
  return {
    tag: panel?.tag ?? "",
    name: panel?.name ?? "",
    serial: panel?.serial ?? "",
    rev: panel?.rev && panel.rev !== "—" ? panel.rev : "",
    voltage: panel?.volt && panel.volt !== "—" ? panel.volt : "",
    current: panel?.amp && panel.amp !== "—" ? panel.amp : "",
    phase: panel?.phase && panel.phase !== "—" ? panel.phase : "",
    mfr: panel?.mfr && panel.mfr !== "—" ? panel.mfr : "",
    enclosure: panel?.enclosure && panel.enclosure !== "—" ? panel.enclosure : "",
    location: panel?.loc && panel.loc !== "—" ? panel.loc : "",
    area: panel?.area && panel.area !== "—" ? panel.area : "",
    company: company?.name ?? "",
    company_short: company?.short_name ?? company?.name ?? "",
    standards,
    scan_url: token ? `${appUrl}/q/${token}` : "",
    logo_url: opts.logoUrl ?? null,
  };
}

/** Resolve a binding to its string value (missing → ""). Mirrors the contract table. */
export function bindValue(binding: Binding, data: LabelData): string {
  return data[binding] ?? "";
}

// ── Sample data (editor preview when no real panel chosen) ─────────────────────
export const SAMPLE_DATA: LabelData = {
  tag: "WTP-BMCC",
  name: "BLOWER MCC",
  serial: "WTP-BMCC-0002",
  rev: "E",
  voltage: "400V",
  current: "800A",
  phase: "3PH",
  mfr: "Siemens",
  enclosure: "IP42",
  location: "Riverside Water Treatment",
  area: "Blower Hall",
  company: "Sample Industrial Co.",
  company_short: "SAMPLE",
  standards: "IEC 61439",
  scan_url: "https://app.example.com/q/sample-token",
  logo_url: null,
};

// ── Size presets (mm) ──────────────────────────────────────────────────────────
export const SIZE_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "90 × 50", w: 90, h: 50 },
  { label: "60 × 40", w: 60, h: 40 },
  { label: "100 × 60", w: 100, h: 60 },
  { label: "100 × 40", w: 100, h: 40 },
  { label: "70 × 50", w: 70, h: 50 },
  { label: "50 × 90", w: 50, h: 90 },
  { label: "40 × 60", w: 40, h: 60 },
  { label: "40 × 40", w: 40, h: 40 },
  { label: "60 × 15", w: 60, h: 15 },
];

export function orientationOf(size: { w: number; h: number }): Orientation {
  return size.w < size.h ? "portrait" : "landscape";
}

// ── Element factory helpers ─────────────────────────────────────────────────────
let idCounter = 0;
export function nextId(prefix = "el"): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

function baseAt(cx: number, cy: number, w: number, h: number, z: number): ElementBase {
  return {
    id: nextId(),
    x: Math.max(0, cx - w / 2),
    y: Math.max(0, cy - h / 2),
    w,
    h,
    rotation: 0,
    z,
    visible: true,
  };
}

const textDefaults: TextLikeProps = {
  font: "sans",
  size_pt: 10,
  weight: 600,
  align: "left",
  color: "#111111",
};

export function makeField(cx: number, cy: number, z: number, dark: boolean): FieldElement {
  return {
    ...baseAt(cx, cy, 40, 8, z),
    type: "field",
    binding: "tag",
    ...textDefaults,
    font: "mono",
    size_pt: 14,
    weight: 700,
    color: dark ? "#ffffff" : "#111111",
  };
}

export function makeText(cx: number, cy: number, z: number, dark: boolean): TextElement {
  return {
    ...baseAt(cx, cy, 40, 6, z),
    type: "text",
    text: "TEXT",
    ...textDefaults,
    color: dark ? "#cdd6df" : "#111111",
  };
}

export function makeQr(cx: number, cy: number, z: number): QrElement {
  return {
    ...baseAt(cx, cy, 22, 22, z),
    type: "qr",
    binding: "scan_url",
    fg: "#000000",
    bg: "#ffffff",
    quiet: 1,
  };
}

export function makeLogo(cx: number, cy: number, z: number): LogoElement {
  return {
    ...baseAt(cx, cy, 10, 10, z),
    type: "logo",
    source: "company",
    fit: "contain",
  };
}

export function makeLine(cx: number, cy: number, z: number, dark: boolean): LineElement {
  return {
    ...baseAt(cx, cy, 40, 0, z),
    type: "line",
    stroke: dark ? "#ffffff1f" : "#000000",
    stroke_w: 0.3,
  };
}

export function makeBox(cx: number, cy: number, z: number, dark: boolean): BoxElement {
  return {
    ...baseAt(cx, cy, 30, 20, z),
    type: "box",
    fill: "none",
    stroke: dark ? "#ffffff24" : "#000000",
    stroke_w: 0.3,
    radius: 1,
  };
}

export type ElementFactoryKind = ElementType;

export function makeElement(
  kind: ElementFactoryKind,
  cx: number,
  cy: number,
  z: number,
  dark: boolean,
): LabelElement {
  switch (kind) {
    case "field":
      return makeField(cx, cy, z, dark);
    case "text":
      return makeText(cx, cy, z, dark);
    case "qr":
      return makeQr(cx, cy, z);
    case "logo":
      return makeLogo(cx, cy, z);
    case "line":
      return makeLine(cx, cy, z, dark);
    case "box":
      return makeBox(cx, cy, z, dark);
  }
}

// ── Default layouts (the two contract examples) ─────────────────────────────────
export function defaultEngravedLayout(): LabelLayout {
  return {
    version: 2,
    orientation: "landscape",
    size_mm: { w: 90, h: 50 },
    background: { kind: "engraved", fill: "#1f242b", radius_mm: 1.8 },
    grid_mm: 1,
    elements: [
      { id: "border", type: "box", x: 2, y: 2, w: 86, h: 46, rotation: 0, z: 0, visible: true, fill: "none", stroke: "#ffffff24", stroke_w: 0.25, radius: 1 },
      { id: "logo", type: "logo", x: 5, y: 4.5, w: 6, h: 6, rotation: 0, z: 1, visible: true, source: "company", fit: "contain" },
      { id: "brand", type: "field", binding: "company_short", x: 12.5, y: 5, w: 40, h: 5, rotation: 0, z: 2, visible: true, font: "sans", size_pt: 7, weight: 700, align: "left", color: "#cdd6df", letter_spacing: 0.12 },
      { id: "tag", type: "field", binding: "tag", x: 5, y: 25, w: 50, h: 11, rotation: 0, z: 3, visible: true, font: "mono", size_pt: 22, weight: 700, align: "left", color: "#ffffff" },
      { id: "name", type: "field", binding: "name", x: 5, y: 36, w: 50, h: 5, rotation: 0, z: 4, visible: true, font: "sans", size_pt: 8, weight: 400, align: "left", color: "#9aa6b2", uppercase: true },
      { id: "div", type: "line", x: 5, y: 22, w: 50, h: 0, rotation: 0, z: 2, visible: true, stroke: "#ffffff1f", stroke_w: 0.3 },
      { id: "serial", type: "field", binding: "serial", x: 5, y: 43, w: 30, h: 4, rotation: 0, z: 5, visible: true, font: "mono", size_pt: 7.5, weight: 400, align: "left", color: "#dde4ec" },
      { id: "rev", type: "field", binding: "rev", x: 38, y: 43, w: 14, h: 4, rotation: 0, z: 5, visible: true, font: "mono", size_pt: 7.5, weight: 400, align: "left", color: "#dde4ec" },
      { id: "qr", type: "qr", binding: "scan_url", x: 62, y: 11, w: 24, h: 24, rotation: 0, z: 6, visible: true, fg: "#000000", bg: "#ffffff", quiet: 1 },
      { id: "scancap", type: "text", text: "SCAN FOR DOCS", x: 60, y: 37, w: 28, h: 3, rotation: 0, z: 6, visible: true, font: "sans", size_pt: 5.5, weight: 600, align: "center", color: "#7d8a97", letter_spacing: 0.1 },
    ],
  };
}

export function defaultPrintLayout(): LabelLayout {
  return {
    version: 2,
    orientation: "landscape",
    size_mm: { w: 90, h: 50 },
    background: { kind: "plain", fill: "#ffffff", radius_mm: 1 },
    grid_mm: 1,
    elements: [
      { id: "hdr", type: "box", x: 0, y: 0, w: 90, h: 8, rotation: 0, z: 0, visible: true, fill: "#000000", stroke: "none", stroke_w: 0, radius: 0 },
      { id: "brand", type: "field", binding: "company", x: 3, y: 0.5, w: 55, h: 6, rotation: 0, z: 1, visible: true, font: "sans", size_pt: 7, weight: 800, align: "left", color: "#ffffff", letter_spacing: 0.12, uppercase: true },
      { id: "asset", type: "text", text: "PANELOS ASSET", x: 55, y: 0.5, w: 32, h: 6, rotation: 0, z: 1, visible: true, font: "sans", size_pt: 6, weight: 600, align: "right", color: "#ffffff" },
      { id: "qr", type: "qr", binding: "scan_url", x: 4, y: 12, w: 26, h: 26, rotation: 0, z: 2, visible: true, fg: "#000000", bg: "#ffffff", quiet: 1 },
      { id: "qrborder", type: "box", x: 4, y: 12, w: 26, h: 26, rotation: 0, z: 1, visible: true, fill: "none", stroke: "#000000", stroke_w: 0.5, radius: 0 },
      { id: "tag", type: "field", binding: "tag", x: 34, y: 11, w: 52, h: 12, rotation: 0, z: 2, visible: true, font: "mono", size_pt: 24, weight: 800, align: "left", color: "#000000" },
      { id: "name", type: "field", binding: "name", x: 34, y: 23, w: 52, h: 5, rotation: 0, z: 2, visible: true, font: "sans", size_pt: 8, weight: 600, align: "left", color: "#000000" },
      { id: "sn", type: "field", binding: "serial", x: 34, y: 31, w: 30, h: 4, rotation: 0, z: 2, visible: true, font: "mono", size_pt: 7, weight: 700, align: "left", color: "#000000" },
      { id: "rev", type: "field", binding: "rev", x: 66, y: 31, w: 20, h: 4, rotation: 0, z: 2, visible: true, font: "mono", size_pt: 7, weight: 700, align: "left", color: "#000000" },
      { id: "foot", type: "line", x: 4, y: 42, w: 82, h: 0, rotation: 0, z: 1, visible: true, stroke: "#000000", stroke_w: 0.3 },
      { id: "std", type: "field", binding: "standards", x: 4, y: 43, w: 30, h: 4, rotation: 0, z: 2, visible: true, font: "mono", size_pt: 6, weight: 400, align: "left", color: "#000000" },
      { id: "url", type: "field", binding: "scan_url", x: 40, y: 43, w: 46, h: 4, rotation: 0, z: 2, visible: true, font: "mono", size_pt: 6, weight: 400, align: "right", color: "#000000" },
    ],
  };
}

/** Blank layout for a given background kind. */
export function blankLayout(kind: BackgroundKind = "engraved"): LabelLayout {
  return {
    version: 2,
    orientation: "landscape",
    size_mm: { w: 90, h: 50 },
    background:
      kind === "engraved"
        ? { kind: "engraved", fill: "#1f242b", radius_mm: 1.8 }
        : { kind: "plain", fill: "#ffffff", radius_mm: 1 },
    grid_mm: 1,
    elements: [],
  };
}

/** Coerce an opaque layout_json into a valid v2 LabelLayout (with fallbacks). */
export function coerceLayout(
  raw: unknown,
  fallbackKind: BackgroundKind = "engraved",
): LabelLayout {
  if (raw && typeof raw === "object" && Array.isArray((raw as LabelLayout).elements)) {
    const l = raw as LabelLayout;
    const size = l.size_mm && typeof l.size_mm.w === "number" ? l.size_mm : { w: 90, h: 50 };
    return {
      version: 2,
      orientation: l.orientation ?? orientationOf(size),
      size_mm: { w: size.w, h: size.h },
      background: l.background ?? blankLayout(fallbackKind).background,
      grid_mm: typeof l.grid_mm === "number" ? l.grid_mm : 1,
      elements: l.elements,
    };
  }
  return fallbackKind === "plain" ? defaultPrintLayout() : defaultEngravedLayout();
}
