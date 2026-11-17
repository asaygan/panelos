"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/data/hooks";
import type { Permission } from "@/data/types";

/**
 * Render children only when the signed-in member has `perm` in the active
 * company. This is UI convenience: the API enforces the same permission.
 */
export function Can({
  perm,
  children,
  fallback = null,
}: {
  perm: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can } = usePermissions();
  return <>{can(perm) ? children : fallback}</>;
}
