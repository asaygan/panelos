import type { Member, Role } from "@/data/types";

export const ROLES: Role[] = ["owner", "admin", "engineer", "technician", "viewer"];

export type Block = "ownerProtected" | "self" | "lastOwner" | null;

export interface Actor {
  userId: string;
  role: Role | null;
}

/**
 * Why the actor may not change this member's role / status / membership, mirroring
 * the API rules (the API stays the source of truth and its error is still shown):
 * an admin cannot act on an owner; you cannot act on yourself; the last active
 * owner cannot be demoted, suspended or removed.
 */
export function blockFor(member: Member, actor: Actor, activeOwners: number): Block {
  if (actor.role === "admin" && member.role === "owner") return "ownerProtected";
  if (member.user_id === actor.userId) return "self";
  if (member.role === "owner" && member.status === "active" && activeOwners <= 1) return "lastOwner";
  return null;
}

/** Roles that location restrictions apply to. */
export const LOCATION_RESTRICTED: Role[] = ["engineer", "technician", "viewer"];
