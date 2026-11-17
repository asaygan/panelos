"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useLabelTemplates } from "@/data/hooks";
import { defaultEngravedLayout, defaultPrintLayout } from "@/lib/api/label-layout";
import { choiceFromTemplate, conceptOf, type LabelChoice } from "./label-utils";

/**
 * All designs a label can be rendered with. Saved templates come first
 * (default on top); a company without any gets the two built-in designs so
 * labels can still be produced.
 */
export function useLabelChoices() {
  const t = useTranslations("labels");
  const query = useLabelTemplates();

  const choices = React.useMemo<LabelChoice[]>(() => {
    if (!query.data) return [];
    if (query.data.length > 0) {
      return query.data
        .map(choiceFromTemplate)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name));
    }
    const builtIn = (id: string, name: string, layout = defaultEngravedLayout()): LabelChoice => ({
      id,
      name,
      isDefault: id === "builtin:engraved",
      templateId: null,
      concept: conceptOf(layout),
      layout,
    });
    return [
      builtIn("builtin:engraved", t("builtin.engraved")),
      builtIn("builtin:plain", t("builtin.plain"), defaultPrintLayout()),
    ];
  }, [query.data, t]);

  const defaultChoice = choices.find((c) => c.isDefault) ?? choices[0];

  return {
    choices,
    defaultChoice,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/** Selected design id with a sensible fallback to the default. */
export function useChoiceSelection(choices: LabelChoice[], fallback: LabelChoice | undefined) {
  const [id, setId] = React.useState<string | null>(null);
  const choice = choices.find((c) => c.id === id) ?? fallback;
  return { choice, choiceId: choice?.id ?? "", setChoiceId: setId };
}
