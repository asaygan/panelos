import { cookies } from "next/headers";
import { ApiError, type ProblemDetail } from "./errors";

const BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Server-side fetch helper — forwards the user's cookies to the API so RSC
 * code can call the same endpoints the browser does.
 */
export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const url = path.startsWith("http")
    ? path
    : `${BASE}${path.startsWith("/api/") ? path : `/api/v1${path.startsWith("/") ? path : `/${path}`}`}`;

  const companyId = cookieStore.get("panelos_company")?.value;

  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(companyId ? { "X-Company-Id": companyId } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const ct = res.headers.get("content-type") || "";
  const parsed =
    text && (ct.includes("application/json") || ct.includes("application/problem+json"))
      ? JSON.parse(text)
      : text || null;

  if (!res.ok) {
    const problem: ProblemDetail =
      parsed && typeof parsed === "object" ? parsed : { detail: String(parsed ?? "") };
    throw new ApiError(res.status, problem);
  }
  return parsed as T;
}
