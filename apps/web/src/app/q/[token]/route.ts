import { NextResponse, type NextRequest } from "next/server";
import { serverFetch } from "@/lib/api/server";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import type { components } from "@panelos/types/generated";

type QrResolve = components["schemas"]["QrResolveOut"];

/**
 * Landing point of every printed QR code: /q/<token>.
 *
 * Signed-in members go straight to the panel. Everyone else is sent to sign in
 * and comes back to the same panel afterwards. The token is resolved on the
 * server (the scan is logged there) with the scanner's cookies forwarded.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const signedIn = Boolean(req.cookies.get(SESSION_COOKIE));
  const url = req.nextUrl.clone();
  url.search = "";

  let resolved: QrResolve | null = null;
  try {
    resolved = await serverFetch<QrResolve>(`/qr/${encodeURIComponent(token)}`);
  } catch {
    resolved = null;
  }

  if (!resolved) {
    url.pathname = "/q/unknown";
    return NextResponse.redirect(url);
  }
  if (signedIn && resolved.is_member) {
    url.pathname = `/panels/${resolved.panel_id}`;
    return NextResponse.redirect(url);
  }
  url.pathname = "/login";
  url.searchParams.set("next", `/panels/${resolved.panel_id}`);
  return NextResponse.redirect(url);
}
