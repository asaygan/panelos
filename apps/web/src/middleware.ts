import { NextResponse, type NextRequest } from "next/server";
import { API_ORIGIN } from "@/lib/api/origin";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  authCookieOptions,
  jwtExp,
  type TokenPair,
} from "@/lib/auth/cookies";

const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/accept",
  "/q",
  "/demo",
  "/api",
  "/_next",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/sw.js",
  "/icons",
  "/offline",
  "/pdf.worker.min.mjs",
];

/** Refresh slightly early so a request never races the token's last second. */
const REFRESH_SKEW_MS = 30_000;

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function toLogin(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  const next = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = "/login";
  url.search = "";
  if (req.nextUrl.pathname !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

async function rotate(refreshToken: string): Promise<TokenPair | null> {
  try {
    const res = await fetch(`${API_ORIGIN}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as TokenPair;
    return body.access_token ? body : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;

  const exp = session ? jwtExp(session) : null;
  const fresh = Boolean(session) && (exp === null || exp * 1000 - REFRESH_SKEW_MS > Date.now());

  if (fresh) return NextResponse.next();

  // Access token missing or expired. With a refresh token we rotate here, on
  // the server, so the page that renders next (and its server components)
  // already sees a valid session — no client round-trip, no surprise logout.
  if (refresh) {
    const tokens = await rotate(refresh);
    if (tokens) {
      const headers = new Headers(req.headers);
      const jar = req.cookies
        .getAll()
        .filter((c) => c.name !== SESSION_COOKIE && c.name !== REFRESH_COOKIE)
        .map((c) => `${c.name}=${c.value}`);
      jar.push(`${SESSION_COOKIE}=${tokens.access_token}`);
      if (tokens.refresh_token) jar.push(`${REFRESH_COOKIE}=${tokens.refresh_token}`);
      headers.set("cookie", jar.join("; "));

      const res = NextResponse.next({ request: { headers } });
      res.cookies.set(SESSION_COOKIE, tokens.access_token, authCookieOptions());
      if (tokens.refresh_token) {
        res.cookies.set(REFRESH_COOKIE, tokens.refresh_token, authCookieOptions());
      }
      return res;
    }
  }

  if (isPublic(pathname)) return NextResponse.next();

  const res = toLogin(req);
  if (session || refresh) {
    // Dead credentials: drop them so the login page starts clean.
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(REFRESH_COOKIE);
  }
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api/|favicon.svg|apple-touch-icon.png|icons/|manifest.webmanifest|sw.js|pdf.worker.min.mjs).*)",
  ],
};
