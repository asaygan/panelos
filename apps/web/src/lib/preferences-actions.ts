"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { serverFetch } from "@/lib/api/server";
import { LOCALE_COOKIE, isLocale } from "@/i18n/config";

/** Switch UI language: cookie for this browser + the user's profile (emails). */
export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  try {
    await serverFetch("/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
  } catch {
    // Not signed in (login page) — the cookie alone is enough.
  }
  revalidatePath("/", "layout");
}
