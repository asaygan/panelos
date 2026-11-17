/**
 * Session cookie contract shared by server actions and middleware.
 *
 * The access token (JWT, ~15 min) lives in `panelos_session`; the refresh token
 * (7 days) in `panelos_refresh`. BOTH cookies live for the refresh lifetime:
 * if the session cookie expired together with the JWT, the browser would stop
 * sending it and the server could no longer tell "expired, refreshable" from
 * "never signed in" — which used to sign people out after 15 idle minutes.
 */
export const SESSION_COOKIE = "panelos_session";
export const REFRESH_COOKIE = "panelos_refresh";
export const COMPANY_COOKIE = "panelos_company";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface TokenPair {
  access_token: string;
  refresh_token?: string;
}

export function authCookieOptions(httpOnly = true) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

/** Decode a JWT's `exp` (seconds) without verifying the signature. Edge-safe. */
export function jwtExp(token: string): number | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(json) as { exp?: number };
    return typeof claims.exp === "number" ? claims.exp : null;
  } catch {
    return null;
  }
}

/** Only same-site relative paths are valid post-login destinations. */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next.startsWith("/login") || next.startsWith("/api/")) return fallback;
  return next;
}
