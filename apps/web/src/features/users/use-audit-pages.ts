"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { auditApi, type AuditQuery } from "@/data/api";
import type { AuditLog } from "@/data/types";

export const AUDIT_PAGE_SIZE = 50;

/** Audit log pages, newest first, continued with the `before` cursor (created_at of the last row). */
export function useAuditPages(filters: Omit<AuditQuery, "before" | "limit">, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ["audit", "pages", filters],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      auditApi.list({ ...filters, limit: AUDIT_PAGE_SIZE, before: pageParam }),
    getNextPageParam: (last: AuditLog[]) =>
      last.length < AUDIT_PAGE_SIZE ? undefined : last[last.length - 1]?.created_at,
  });
}
