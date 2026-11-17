"use client";

import * as React from "react";
import { useCompany } from "@/data/hooks";
import { companyApi } from "@/data/api";
import type { Panel } from "@/data/types";
import { SAMPLE_DATA, buildLabelData, type LabelData } from "@/lib/api/label-layout";

function useLogoUrl(): string | null {
  const { data: company } = useCompany();
  return company?.logo_key ? companyApi.logoUrl(company.logo_key) : null;
}

/** Binding data of one panel (QR = scanUrl(panel.qr_token)). */
export function useLabelData(panel: Panel | undefined): LabelData {
  const { data: company } = useCompany();
  const logoUrl = useLogoUrl();
  return React.useMemo(
    () => buildLabelData(panel, company, { logoUrl }),
    [panel, company, logoUrl],
  );
}

/** Same, as a function (batch printing needs data for many panels). */
export function useLabelDataBuilder(): (panel: Panel) => LabelData {
  const { data: company } = useCompany();
  const logoUrl = useLogoUrl();
  return React.useCallback(
    (panel: Panel) => buildLabelData(panel, company, { logoUrl }),
    [company, logoUrl],
  );
}

/** Designer preview data: a real panel when given, else sample values with the company's own name/logo. */
export function useDesignerData(panel: Panel | undefined): LabelData {
  const { data: company } = useCompany();
  const logoUrl = useLogoUrl();
  return React.useMemo(() => {
    if (panel) return buildLabelData(panel, company, { logoUrl });
    return {
      ...SAMPLE_DATA,
      company: company?.name ?? SAMPLE_DATA.company,
      company_short: company?.short_name ?? company?.name ?? SAMPLE_DATA.company_short,
      logo_url: logoUrl,
    };
  }, [panel, company, logoUrl]);
}
