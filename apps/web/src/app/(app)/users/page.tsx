"use client";

import { useEffect, useMemo, useState } from "react";
import { Page } from "@/components/primitives/page";
import { Toolbar } from "@/components/primitives/toolbar";
import { Select } from "@/components/primitives/select";
import { Input } from "@/components/primitives/input";
import { Btn } from "@/components/primitives/button";
import { Card, CardHead } from "@/components/primitives/card";
import { Empty } from "@/components/primitives/empty";
import { Tabs, TabPanel } from "@/components/primitives/tabs";
import { useToast } from "@/components/primitives/toast";
import { MembersTable } from "@/components/users/members-table";
import { RolesCard } from "@/components/users/roles-card";
import { PermissionMatrix } from "@/components/users/permission-matrix";
import { AuditList } from "@/components/users/audit-list";
import { InviteModal } from "@/components/users/invite-modal";
import { ChangeRoleModal } from "@/components/users/change-role-modal";
import { AssignLocationsModal } from "@/components/users/assign-locations-modal";
import { RemoveMemberModal } from "@/components/users/remove-member-modal";
import { UserDetailsDrawer } from "@/components/users/user-details-drawer";
import { computeGuards } from "@/components/users/guards";
import { ROLE_LABEL, ROLE_ORDER } from "@/components/users/role-meta";
import {
  useUsers,
  useLocations,
  useRoles,
  useUserAuditLogs,
  useCurrentMembership,
  useChangeStatus,
  useResendInvite,
} from "@/lib/query/hooks";
import { ApiError } from "@/lib/api/errors";
import type { Member } from "@/lib/api/types";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
];

export default function UsersPage() {
  const toast = useToast();
  const current = useCurrentMembership();
  const actor = current?.role ? { userId: current.userId, role: current.role } : null;
  const isAdmin = current?.role === "admin";

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [tab, setTab] = useState("roles");

  const [invite, setInvite] = useState(false);
  const [changeRoleFor, setChangeRoleFor] = useState<Member | null>(null);
  const [assignFor, setAssignFor] = useState<Member | null>(null);
  const [removeFor, setRemoveFor] = useState<Member | null>(null);
  const [detailsFor, setDetailsFor] = useState<Member | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo(
    () => ({
      search: debounced || undefined,
      role: role !== "all" ? role : undefined,
      status: status !== "all" ? status : undefined,
      location_id: locationId !== "all" ? locationId : undefined,
    }),
    [debounced, role, status, locationId],
  );

  const { data: members = [], isLoading, isError, refetch } = useUsers(filters);
  const { data: locations = [] } = useLocations();
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: audit = [], isLoading: auditLoading, isError: auditError } = useUserAuditLogs();

  const changeStatus = useChangeStatus();
  const resend = useResendInvite();

  const hasFilters =
    !!debounced || role !== "all" || status !== "all" || locationId !== "all";

  const onToggleStatus = async (m: Member, next: "active" | "suspended") => {
    try {
      await changeStatus.mutateAsync({ membershipId: m.membershipId, status: next });
      toast.success(next === "suspended" ? `${m.name} suspended.` : `${m.name} reactivated.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update status.");
    }
  };

  const onResend = async (m: Member) => {
    try {
      await resend.mutateAsync(m.membershipId);
      toast.success(`Invitation resent to ${m.email}.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not resend invite.");
    }
  };

  return (
    <Page>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 18, fontWeight: 680, margin: 0 }}>Users &amp; Access</h1>
        <p style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-3)", margin: "3px 0 0" }}>
          Manage organization members, roles and access permissions
        </p>
      </div>

      <Toolbar>
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 220 }}
        />
        <Select style={{ width: "auto" }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All roles</option>
          {ROLE_ORDER.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </Select>
        <Select style={{ width: "auto" }} value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select
          style={{ width: "auto" }}
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="all">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code} · {l.name.split(" — ")[0] ?? l.name}
            </option>
          ))}
        </Select>
        <Btn
          size="sm"
          variant="primary"
          icon="plus"
          style={{ marginLeft: "auto" }}
          onClick={() => setInvite(true)}
        >
          Invite member
        </Btn>
      </Toolbar>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "var(--gap)" }}>
        <Card style={{ overflow: "hidden" }}>
          {isLoading ? (
            <Empty icon="users" title="Loading members…" />
          ) : isError ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "40px 20px",
              }}
            >
              <Empty icon="alert-triangle" title="Couldn't load members" />
              <Btn size="sm" icon="rotate" onClick={() => refetch()}>
                Retry
              </Btn>
            </div>
          ) : members.length === 0 ? (
            <Empty
              icon="users"
              title={hasFilters ? "No members found" : "Invite your first team member"}
              sub={
                hasFilters
                  ? "Try adjusting your filters."
                  : "Send an invitation to start building your team."
              }
            />
          ) : (
            <MembersTable
              members={members}
              actor={actor}
              actions={{
                onView: setDetailsFor,
                onChangeRole: setChangeRoleFor,
                onAssignLocations: setAssignFor,
                onResend,
                onToggleStatus,
                onRemove: setRemoveFor,
              }}
            />
          )}
        </Card>

        <Card>
          <CardHead title="Roles &amp; permissions" />
          <Tabs
            value={tab}
            onValueChange={setTab}
            tabs={[
              { value: "roles", label: "Roles" },
              { value: "matrix", label: "Permission Matrix" },
              { value: "audit", label: "Audit" },
            ]}
          >
            <TabPanel value="roles">
              <RolesCard roles={roles} loading={rolesLoading} />
            </TabPanel>
            <TabPanel value="matrix">
              <PermissionMatrix roles={roles} loading={rolesLoading} />
            </TabPanel>
            <TabPanel value="audit">
              <AuditList entries={audit} loading={auditLoading} error={auditError} />
            </TabPanel>
          </Tabs>
        </Card>
      </div>

      <InviteModal
        open={invite}
        onOpenChange={setInvite}
        locations={locations}
        blockOwnerRole={isAdmin}
      />
      <ChangeRoleModal
        member={changeRoleFor}
        onClose={() => setChangeRoleFor(null)}
        blockOwnerRole={
          changeRoleFor
            ? computeGuards(changeRoleFor, actor, 99).blockOwnerRole
            : false
        }
      />
      <AssignLocationsModal
        member={assignFor}
        locations={locations}
        onClose={() => setAssignFor(null)}
      />
      <RemoveMemberModal member={removeFor} onClose={() => setRemoveFor(null)} />
      <UserDetailsDrawer member={detailsFor} audit={audit} onClose={() => setDetailsFor(null)} />
    </Page>
  );
}
