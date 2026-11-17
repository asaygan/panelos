/**
 * Origin of the FastAPI service as seen from the Next.js SERVER (server actions,
 * route handlers, middleware, RSC). The browser never uses this: it talks to the
 * same-origin `/api/v1` rewrite so auth cookies flow without CORS.
 */
export const API_ORIGIN = (
  process.env.API_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000"
).replace(/\/+$/, "");

/** Public origin of this web app (what a printed QR code points at). */
export function appOrigin(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

/** The URL encoded in a panel's QR code. */
export function scanUrl(qrToken: string): string {
  return `${appOrigin()}/q/${qrToken}`;
}
