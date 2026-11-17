"use client";

import { Hash, ImageIcon, Minus, QrCode, Square, Type } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ElementType, LabelElement } from "@/lib/api/label-layout";

export const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  field: <Hash />,
  text: <Type />,
  qr: <QrCode />,
  logo: <ImageIcon />,
  line: <Minus />,
  box: <Square />,
};

/** Human name of an element: its binding, its text, or its type. */
export function useElementName() {
  const t = useTranslations("labels");
  return (el: LabelElement): string =>
    el.type === "field"
      ? t(`bindings.${el.binding}`)
      : el.type === "text"
        ? el.text || t("elements.text")
        : t(`elements.${el.type}`);
}
