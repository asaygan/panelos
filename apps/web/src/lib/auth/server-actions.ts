"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/api/server";
import { API_ORIGIN } from "@/lib/api/origin";
import {
  COMPANY_COOKIE,
  REFRESH_COOKIE,
  SESSION_COOKIE,
  authCookieOptions,
  safeNextPath,
  type TokenPair,
} from "@/lib/auth/cookies";

export interface LoginState {
  /** Stable error code; the page translates it. */
  error?: "required" | "invalid" | "invalid_mfa" | "rate_limited" | "failed" | "network";
  /** Set when the account has two-step verification: ask for the code next. */
  mfaRequired?: boolean;
}

/** Persist the session cookies + the active company for a fresh token pair. */
async function establishSession(tokens: TokenPair): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, tokens.access_token, authCookieOptions());
  if (tokens.refresh_token) store.set(REFRESH_COOKIE, tokens.refresh_token, authCookieOptions());

  // Remember the active company in a readable cookie so the browser client can
  // send X-Company-Id for users who belong to several organizations.
  try {
    const meRes = await fetch(`${API_ORIGIN}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (meRes.ok) {
      const me = (await meRes.json()) as { companies?: { id: string }[] };
      const current = store.get(COMPANY_COOKIE)?.value;
      const ids = (me.companies ?? []).map((c) => c.id);
      const companyId = current && ids.includes(current) ? current : ids[0];
      if (companyId) store.set(COMPANY_COOKIE, companyId, authCookieOptions(false));
      else store.delete(COMPANY_COOKIE);
    }
  } catch {
    // Non-fatal: single-company accounts work without the header.
  }
}

export async function loginAction(
  _prev: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const mfaCode = String(formData.get("mfa_code") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? ""));
  if (!email || !password) return { error: "required" };

  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ...(mfaCode ? { mfa_code: mfaCode } : {}) }),
      cache: "no-store",
    });
    if (!res.ok) {
      const problem = (await res.json().catch(() => ({}))) as { code?: string };
      if (problem.code === "mfa_required") return { mfaRequired: true };
      if (problem.code === "invalid_mfa_code") return { mfaRequired: true, error: "invalid_mfa" };
      if (res.status === 401) return { error: "invalid" };
      if (res.status === 429) return { error: "rate_limited" };
      return { error: "failed" };
    }
    const body = (await res.json()) as Partial<TokenPair>;
    if (!body.access_token) return { error: "failed" };
    await establishSession(body as TokenPair);
  } catch {
    return { error: "network" };
  }

  // `next` is validated by safeNextPath; typedRoutes can't know that statically.
  redirect(next as Parameters<typeof redirect>[0]);
}

export interface AcceptInviteState {
  error?: "missing_token" | "weak_password" | "mismatch" | "invalid" | "expired" | "used" | "failed" | "network";
  ok?: boolean;
}

/**
 * Public onboarding: exchange an invite token + new password for login tokens,
 * set the session cookies, then land on the dashboard. A server action so the
 * httpOnly cookies are set server-side.
 */
export async function acceptInviteAction(
  _prev: AcceptInviteState | undefined,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!token) return { error: "missing_token" };
  if (password.length < 10) return { error: "weak_password" };
  if (password !== confirm) return { error: "mismatch" };

  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/auth/accept-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: name || null, password }),
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 404) return { error: "invalid" };
      if (res.status === 410) return { error: "expired" };
      if (res.status === 409) return { error: "used" };
      if (res.status === 422) return { error: "weak_password" };
      return { error: "failed" };
    }
    const body = (await res.json()) as Partial<TokenPair>;
    if (!body.access_token) return { error: "failed" };
    await establishSession(body as TokenPair);
  } catch {
    return { error: "network" };
  }

  redirect("/dashboard");
}

/** Switch the active organization (multi-company accounts). */
export async function switchCompanyAction(companyId: string): Promise<void> {
  const store = await cookies();
  store.set(COMPANY_COOKIE, companyId, authCookieOptions(false));
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  try {
    await serverFetch<void>("/auth/logout", { method: "POST" });
  } catch {
    // Ignore: the cookies are cleared regardless.
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(REFRESH_COOKIE);
  store.delete(COMPANY_COOKIE);
  redirect("/login");
}
