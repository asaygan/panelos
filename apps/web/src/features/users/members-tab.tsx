"use client";

import * as React from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm";
import { Avatar } from "@/components/ui/controls";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Input, NativeSelect } from "@/components/ui/input";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { RoleBadge } from "@/components/domain/badges";
import { useMe, useMemberMutations, useMembers } from "@/data/hooks";
import type { Member, Role } from "@/data/types";
import { useApiError } from "@/lib/use-api-error";
import { blockFor, ROLES } from "./guards";
import { InviteDialog } from "./invite-dialog";
import { LocationsDialog } from "./locations-dialog";
import { ActivityText, LocationChips, StatusBadge } from "./member-parts";
import { MemberMenu, type MemberAction } from "./member-menu";
import { RoleDialog } from "./role-dialog";

const STATUSES = ["active", "invited", "suspended"] as const;

function Identity({ member, isMe }: { member: Member; isMe: boolean }) {
  const tc = useTranslations("common");
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={member.name || member.email} src={member.avatar_url} />
      <div className="min-w-0">
        <p className="truncate text-base font-medium">
          {member.name || member.email}
          {isMe && <span className="ml-1.5 text-xs font-normal text-subtle">({tc("states.you")})</span>}
        </p>
        <p className="truncate text-sm text-muted">{member.email}</p>
      </div>
    </div>
  );
}

export function MembersTab() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const errorText = useApiError();
  const confirm = useConfirm();
  const { data: me } = useMe();
  const { data, isLoading, isError, refetch } = useMembers();
  const { changeStatus, remove, resend } = useMemberMutations();

  const [search, setSearch] = React.useState("");
  const [role, setRole] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [roleFor, setRoleFor] = React.useState<Member | null>(null);
  const [locationsFor, setLocationsFor] = React.useState<Member | null>(null);

  const actor = { userId: me?.id ?? "", role: (me?.role ?? null) as Role | null };
  const members = React.useMemo(() => data ?? [], [data]);
  const activeOwners = members.filter((m) => m.role === "owner" && m.status === "active").length;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return members.filter(
      (m) =>
        (!role || m.role === role) &&
        (!status || m.status === status) &&
        (!q || m.name.toLocaleLowerCase("tr").includes(q) || m.email.toLocaleLowerCase("tr").includes(q)),
    );
  }, [members, search, role, status]);

  const onAction = async (action: MemberAction, m: Member) => {
    const fail = { onError: (e: unknown) => toast.error(errorText(e)) };
    if (action === "role") return setRoleFor(m);
    if (action === "locations") return setLocationsFor(m);
    if (action === "resend")
      return resend.mutate(m.membership_id, { ...fail, onSuccess: () => toast.success(t("menu.resent", { email: m.email })) });
    const destructive = action === "remove";
    const ok = await confirm({
      title: t(`confirm.${action}.title`, { name: m.name || m.email }),
      description: t(`confirm.${action}.description`),
      confirmLabel: t(`confirm.${action}.confirm`),
      cancelLabel: tc("actions.cancel"),
      destructive: destructive || action === "suspend",
    });
    if (!ok) return;
    if (action === "remove")
      remove.mutate(m.membership_id, { ...fail, onSuccess: () => toast.success(t("confirm.remove.done")) });
    else
      changeStatus.mutate(
        { id: m.membership_id, status: action === "suspend" ? "suspended" : "active" },
        { ...fail, onSuccess: () => toast.success(t(`confirm.${action}.done`)) },
      );
  };

  const inviteButton = (
    <Button variant="primary" onClick={() => setInviteOpen(true)}>
      <UserPlus />
      {t("invite.open")}
    </Button>
  );

  const actions = (m: Member) => (
    <MemberMenu member={m} block={blockFor(m, actor, activeOwners)} onAction={(a, mm) => void onAction(a, mm)} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("filters.search")}
            aria-label={t("filters.search")}
            className="pl-9"
          />
        </div>
        <NativeSelect value={role} onChange={(e) => setRole(e.target.value)} aria-label={tc("fields.role")} className="sm:w-44">
          <option value="">{t("filters.allRoles")}</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {tc(`roles.${r}`)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)} aria-label={tc("fields.status")} className="sm:w-44">
          <option value="">{t("filters.allStatuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`status.${s}`)}
            </option>
          ))}
        </NativeSelect>
        <div className="sm:ml-auto">{inviteButton}</div>
      </div>

      <Card>
        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : isError ? (
          <ErrorState
            title={tc("states.errorTitle")}
            description={tc("states.errorHint")}
            action={<Button onClick={() => void refetch()}>{tc("actions.retry")}</Button>}
          />
        ) : members.length === 0 ? (
          <EmptyState icon={<Users />} title={t("empty.title")} description={t("empty.description")} action={inviteButton} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search />}
            title={tc("states.noResults")}
            description={tc("states.noResultsHint")}
            action={
              <Button
                onClick={() => {
                  setSearch("");
                  setRole("");
                  setStatus("");
                }}
              >
                {tc("actions.clear")}
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <Th>{tc("entities.member")}</Th>
                    <Th>{tc("fields.role")}</Th>
                    <Th>{tc("fields.status")}</Th>
                    <Th>{tc("entities.locations")}</Th>
                    <Th>{t("columns.activity")}</Th>
                    <Th className="w-12">
                      <span className="sr-only">{tc("fields.actions")}</span>
                    </Th>
                  </tr>
                </THead>
                <TBody>
                  {filtered.map((m) => (
                    <Tr key={m.membership_id}>
                      <Td className="max-w-[18rem]">
                        <Identity member={m} isMe={m.user_id === actor.userId} />
                      </Td>
                      <Td>
                        <RoleBadge role={m.role} />
                      </Td>
                      <Td>
                        <StatusBadge status={m.status} />
                      </Td>
                      <Td className="max-w-[16rem] py-2">
                        <LocationChips member={m} />
                      </Td>
                      <Td className="whitespace-nowrap text-sm text-muted">
                        <ActivityText member={m} />
                      </Td>
                      <Td className="text-right">{actions(m)}</Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((m) => (
                <li key={m.membership_id} className="flex flex-col gap-2.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Identity member={m} isMe={m.user_id === actor.userId} />
                    {actions(m)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={m.role} />
                    <StatusBadge status={m.status} />
                    <span className="text-xs text-muted">
                      <ActivityText member={m} />
                    </span>
                  </div>
                  <LocationChips member={m} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} actorRole={actor.role} />
      <RoleDialog member={roleFor} actorRole={actor.role} onClose={() => setRoleFor(null)} />
      <LocationsDialog member={locationsFor} onClose={() => setLocationsFor(null)} />
    </div>
  );
}
