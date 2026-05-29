"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/api/server";
import { ApiError } from "@/lib/api/errors";

export interface LoginState {
  error?: string;
  ok?: boolean;
}

export async function loginAction(_prev: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email and password are required." };

  try {
    // The API responds with Set-Cookie for `panelos_session`; serverFetch forwards
    // the response cookies via the underlying fetch (Next 15 wires this through
    // the response to the client when the action is invoked from a form).
    const res = await fetch(
      `${process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      },
    );
    if (!res.ok) {
      return { error: res.status === 401 ? "Invalid credentials." : `Sign-in failed (${res.status}).` };
    }
    const body = (await res.json()) as { access_token?: string; refresh_token?: string };
    if (!body.access_token) {
      return { error: "Sign-in failed: no token in response." };
    }
    const store = await cookies();
    store.set("panelos_session", body.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
    });
    if (body.refresh_token) {
      store.set("panelos_refresh", body.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    // Resolve the active company id and persist it in a non-httpOnly cookie so the
    // browser client can attach X-Company-Id on multi-company accounts.
    try {
      const apiBase =
        process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const meRes = await fetch(`${apiBase}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${body.access_token}` },
        cache: "no-store",
      });
      if (meRes.ok) {
        const me = (await meRes.json()) as { companies?: { id: string }[] };
        const companyId = me.companies?.[0]?.id;
        if (companyId) {
          store.set("panelos_company", companyId, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
          });
        }
      }
    } catch {
      // non-fatal — single-company accounts work without the header.
    }
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: "Network error — try again." };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  try {
    await serverFetch<void>("/auth/logout", { method: "POST" });
  } catch {
    // ignore; we clear the cookie regardless.
  }
  const store = await cookies();
  store.delete("panelos_session");
  redirect("/login");
}
