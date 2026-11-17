export const LOCALES = ["tr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE = "panelos_locale";
export const THEME_COOKIE = "panelos_theme";
export const DEFAULT_TIME_ZONE = "Europe/Istanbul";

export const LOCALE_NAMES: Record<Locale, string> = { tr: "Türkçe", en: "English" };

export function isLocale(value: string | undefined | null): value is Locale {
  return LOCALES.includes(value as Locale);
}
