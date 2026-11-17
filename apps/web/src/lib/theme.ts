import { THEME_COOKIE } from "@/i18n/config";

export type ThemePreference = "light" | "dark" | "system";

export function isThemePreference(v: string | undefined | null): v is ThemePreference {
  return v === "light" || v === "dark" || v === "system";
}

/**
 * Inline script for <head>: resolves "system" before first paint so the page
 * never flashes the wrong theme. The explicit choices are rendered server-side
 * from the cookie and need no script.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var d=document.documentElement;if(d.dataset.themePref==="system"){d.dataset.theme=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}}catch(e){}})()`;

/** Apply + persist a theme choice (client only). */
export function applyTheme(pref: ThemePreference): void {
  const resolved =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : pref;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePref = pref;
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}
