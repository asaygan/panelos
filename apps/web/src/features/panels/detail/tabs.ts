export const PANEL_TABS = [
  "overview",
  "schematics",
  "revisions",
  "bom",
  "cabinets",
  "maintenance",
  "issues",
  "files",
  "activity",
] as const;

export type PanelTab = (typeof PANEL_TABS)[number];

/** Unknown or missing ?tab values fall back to the overview. */
export function parseTab(value: string | null | undefined): PanelTab {
  return (PANEL_TABS as readonly string[]).includes(value ?? "") ? (value as PanelTab) : "overview";
}
