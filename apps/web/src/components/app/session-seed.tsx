"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/data/hooks";
import type { Me } from "@/data/types";

/**
 * Puts the server-resolved session into the query cache before anything below
 * renders. Permission-gated UI (`usePermissions`, `<Can>`) therefore renders
 * the same on the server and during hydration — no mismatch, and no flash of
 * missing buttons while `/auth/me` loads.
 */
export function SessionSeed({ me, children }: { me: Me; children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const seededFor = React.useRef<string | null>(null);
  const stamp = `${me.id}:${me.active_company_id ?? ""}:${me.role ?? ""}`;
  if (seededFor.current !== stamp) {
    queryClient.setQueryData(qk.me, me);
    seededFor.current = stamp;
  }
  return <>{children}</>;
}
