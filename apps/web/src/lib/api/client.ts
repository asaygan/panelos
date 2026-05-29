import { ApiError, type ProblemDetail } from "./errors";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "/api/v1";

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Raw body (FormData / Blob) sent as-is without JSON serialization. */
  rawBody?: BodyInit;
  query?: Record<string, string | number | boolean | undefined | null>;
}

/** Reads the active company id from the non-httpOnly `panelos_company` cookie. */
function activeCompanyId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)panelos_company=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = path.startsWith("http") ? path : `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json") || ct.includes("application/problem+json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

async function rawRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { body, rawBody, query, headers, ...rest } = opts;
  const companyId = activeCompanyId();
  const init: RequestInit = {
    ...rest,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined && rawBody === undefined ? { "Content-Type": "application/json" } : {}),
      ...(companyId ? { "X-Company-Id": companyId } : {}),
      ...(headers as Record<string, string> | undefined),
    },
    body:
      rawBody !== undefined
        ? rawBody
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  };

  const res = await fetch(buildUrl(path, query), init);
  const parsed = await parseBody(res);

  if (!res.ok) {
    const problem: ProblemDetail =
      parsed && typeof parsed === "object" ? (parsed as ProblemDetail) : { detail: String(parsed ?? "") };
    throw new ApiError(res.status, problem);
  }
  return parsed as T;
}

let refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (!refreshPromise) {
    refreshPromise = fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) throw new ApiError(res.status, { detail: "Refresh failed" });
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && !path.includes("/auth/")) {
      try {
        await refreshSession();
        return await rawRequest<T>(path, opts);
      } catch {
        throw err;
      }
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method">) =>
    apiRequest<T>(path, { ...opts, method: "PUT", body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
