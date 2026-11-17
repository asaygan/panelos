import { cache } from "react";
import { serverFetch } from "@/lib/api/server";
import type { Me } from "@/data/types";

/** The signed-in user (with companies, role and permissions), or null. Cached per request. */
export const getSession = cache(async (): Promise<Me | null> => {
  try {
    return await serverFetch<Me>("/auth/me");
  } catch {
    return null;
  }
});
