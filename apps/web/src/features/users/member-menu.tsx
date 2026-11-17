"use client";

import { MailPlus, MapPin, MoreHorizontal, ShieldCheck, UserCheck, UserMinus, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/menu";
import type { Member } from "@/data/types";
import type { Block } from "./guards";

export type MemberAction = "role" | "locations" | "suspend" | "activate" | "resend" | "remove";

/** Row actions. Blocked items stay visible but disabled, with the reason underneath. */
export function MemberMenu({
  member,
  block,
  onAction,
}: {
  member: Member;
  block: Block;
  onAction: (action: MemberAction, member: Member) => void;
}) {
  const t = useTranslations("users.menu");
  const locked = block === "ownerProtected";
  const noChange = block !== null; // role / status / removal
  const run = (a: MemberAction) => () => onAction(a, member);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("open", { name: member.name })}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64">
        <DropdownMenuItem disabled={noChange} onSelect={run("role")}>
          <ShieldCheck />
          {t("role")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={locked} onSelect={run("locations")}>
          <MapPin />
          {t("locations")}
        </DropdownMenuItem>
        {member.status === "invited" && (
          <DropdownMenuItem disabled={locked} onSelect={run("resend")}>
            <MailPlus />
            {t("resend")}
          </DropdownMenuItem>
        )}
        {member.status === "suspended" ? (
          <DropdownMenuItem disabled={locked} onSelect={run("activate")}>
            <UserCheck />
            {t("activate")}
          </DropdownMenuItem>
        ) : member.status === "active" ? (
          <DropdownMenuItem disabled={noChange} onSelect={run("suspend")}>
            <UserX />
            {t("suspend")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={noChange} onSelect={run("remove")}>
          <UserMinus />
          {t("remove")}
        </DropdownMenuItem>
        {block && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="whitespace-normal font-normal">
              {t(`blocked.${block}`)}
            </DropdownMenuLabel>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
