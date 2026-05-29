import type { Member, Role } from "@/lib/api/types";

export interface ActorContext {
  userId: string;
  role: Role | null;
}

export interface RowGuards {
  /** Actor may perform mutating actions on this row at all. */
  canManage: boolean;
  canChangeRole: boolean;
  canSuspend: boolean;
  canActivate: boolean;
  canRemove: boolean;
  canAssignLocations: boolean;
  canResend: boolean;
  /** True when the actor (admin) cannot select the Owner role in pickers. */
  blockOwnerRole: boolean;
}

/**
 * Best-effort client guards mirroring the server rules. The server remains the
 * source of truth — these only hide/disable actions that would always 403.
 *
 * Rules: only owner/admin manage members; admin cannot act on owner rows; a
 * user cannot remove or downgrade themselves; the last active owner cannot be
 * removed, suspended, or downgraded.
 */
export function computeGuards(
  member: Member,
  actor: ActorContext | null,
  activeOwnerCount: number,
): RowGuards {
  const none: RowGuards = {
    canManage: false,
    canChangeRole: false,
    canSuspend: false,
    canActivate: false,
    canRemove: false,
    canAssignLocations: false,
    canResend: false,
    blockOwnerRole: false,
  };

  if (!actor || (actor.role !== "owner" && actor.role !== "admin")) return none;

  const isSelf = actor.userId === member.userId;
  const adminActingOnOwner = actor.role === "admin" && member.role === "owner";
  if (adminActingOnOwner) return none;

  const blockOwnerRole = actor.role === "admin";
  const isLastOwner = member.role === "owner" && activeOwnerCount <= 1;

  return {
    canManage: true,
    // can't downgrade self; last owner can't be downgraded.
    canChangeRole: !isSelf && !isLastOwner,
    // last owner can't be suspended; can't suspend self.
    canSuspend: member.status !== "suspended" && !isSelf && !isLastOwner,
    canActivate: member.status === "suspended",
    // can't remove self; last owner can't be removed.
    canRemove: !isSelf && !isLastOwner,
    canAssignLocations: true,
    canResend: member.status === "invited",
    blockOwnerRole,
  };
}
