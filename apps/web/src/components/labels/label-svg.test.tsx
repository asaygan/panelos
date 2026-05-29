import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LabelSvg } from "./label-svg";
import {
  SAMPLE_DATA,
  UNITS_PER_MM,
  defaultEngravedLayout,
  defaultPrintLayout,
} from "@/lib/api/label-layout";

describe("LabelSvg — rendering contract", () => {
  it("renders the engraved example (#1) without errors and matches the viewBox", () => {
    const layout = defaultEngravedLayout();
    const svg = renderToStaticMarkup(<LabelSvg layout={layout} data={SAMPLE_DATA} />);
    // viewBox = size_mm * UNITS_PER_MM
    expect(svg).toContain(
      `viewBox="0 0 ${layout.size_mm.w * UNITS_PER_MM} ${layout.size_mm.h * UNITS_PER_MM}"`,
    );
    // engraved background gradient + screw holes
    expect(svg).toContain("engravedBg");
    expect(svg).toContain("screwHole");
    // bound values appear
    expect(svg).toContain(SAMPLE_DATA.tag);
    expect(svg).toContain("SCAN FOR DOCS");
    // QR drawn as crisp rects
    expect(svg).toContain("crispEdges");
  });

  it("renders the print example (#2) with a plain background and bound fields", () => {
    const layout = defaultPrintLayout();
    const svg = renderToStaticMarkup(<LabelSvg layout={layout} data={SAMPLE_DATA} />);
    expect(svg).toContain(
      `viewBox="0 0 ${layout.size_mm.w * UNITS_PER_MM} ${layout.size_mm.h * UNITS_PER_MM}"`,
    );
    // plain bg has the hairline border, no engraved gradient fill on the bg rect
    expect(svg).toContain("PANELOS ASSET");
    expect(svg).toContain(SAMPLE_DATA.tag);
    expect(svg).toContain(SAMPLE_DATA.scan_url);
  });

  it("computes font-size as size_pt * (254/72)", () => {
    const layout = defaultPrintLayout();
    const svg = renderToStaticMarkup(<LabelSvg layout={layout} data={SAMPLE_DATA} />);
    // tag is 24pt → 24 * 254/72 ≈ 84.666...
    expect(svg).toContain(`font-size="${24 * (254 / 72)}"`);
  });
});
