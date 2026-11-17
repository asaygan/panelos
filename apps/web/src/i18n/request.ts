import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE, LOCALE_COOKIE, isLocale, type Locale } from "./config";

/**
 * Locale without URL prefixes: a cookie decides (set by the language switcher
 * and mirrored to the user's profile). First visit falls back to the browser's
 * language when it is one we support, else Turkish.
 */
async function resolveLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../../messages/${locale}/index.ts`)).default;
  return {
    locale,
    messages,
    timeZone: DEFAULT_TIME_ZONE,
    // A missing key must never take a page down in production.
    onError(error) {
      if (process.env.NODE_ENV !== "production") console.warn(error.message);
    },
    getMessageFallback({ namespace, key }) {
      return namespace ? `${namespace}.${key}` : key;
    },
  };
});
