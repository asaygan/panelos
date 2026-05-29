import { NextResponse, type NextRequest } from "next/server";
import { qr } from "@/lib/api/endpoints";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const session = req.cookies.get("panelos_session");
  try {
    const resolved = await qr.resolve(token);
    const url = req.nextUrl.clone();
    if (session) {
      url.pathname = `/panels/${resolved.panel_id}`;
    } else {
      url.pathname = "/login";
      url.searchParams.set("next", `/panels/${resolved.panel_id}`);
    }
    return NextResponse.redirect(url);
  } catch {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", `/q/${token}`);
    return NextResponse.redirect(url);
  }
}
