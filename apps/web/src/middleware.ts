import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/accept", "/q", "/demo", "/api", "/_next", "/favicon.svg", "/apple-touch-icon.png"];

/** Decode a JWT's `exp` (seconds) without verifying the signature. Edge-safe. */
function jwtExp(token: string): number | null {
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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  const session = req.cookies.get("panelos_session");
  const hasRefresh = Boolean(req.cookies.get("panelos_refresh"));

  // No session at all, or an expired access token with no refresh cookie to
  // recover from → bounce to login. If the access token is expired but a refresh
  // cookie is present, let the request through: the browser client's 401-driven
  // silent refresh rotates the cookies without a full logout.
  const exp = session ? jwtExp(session.value) : null;
  const expired = exp !== null && exp * 1000 <= Date.now();
  if (!session || (expired && !hasRefresh)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg|apple-touch-icon.png).*)"],
};
