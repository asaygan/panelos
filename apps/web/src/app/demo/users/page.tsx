"use client";

import { useMemo, useState } from "react";
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
import { UserDetailsDrawer } from "@/components/users/user-details-drawer";
import { ROLE_LABEL, ROLE_ORDER } from "@/components/users/role-meta";
import type { ActorContext } from "@/components/users/guards";
import { demoAudit, demoLocations, demoMembers, demoRoles } from "@/lib/demo/data";
import type { Member } from "@/lib/api/types";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "suspended", label: "Suspended" },
];

// Demo actor is the Owner — so every menu action is visible (then no-ops with a toast).
const DEMO_ACTOR: ActorContext = { userId: "demo-owner", role: "owner" };

export default function DemoUsersPage() {
  const toast = useToast();
  const fake = () => toast.success("Demo mode — changes aren't saved.");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [tab, setTab] = useState("roles");
  const [detailsFor, setDetailsFor] = useState<Member | null>(null);

  const members = useMemo(
    () =>
      demoMembers.filter(
        (m) =>
          (role === "all" || m.role === role) &&
          (status === "all" || m.status === status) &&
          (locationId === "all" || m.locations.some((l) => l.id === locationId)) &&
          (search === "" || (m.name + m.email).toLowerCase().includes(search.toLowerCase())),
      ),
    [role, status, locationId, search],
  );

  const hasFilters = !!search || role !== "all" || status !== "all" || locationId !== "all";

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
        <Select style={{ width: "auto" }} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="all">All locations</option>
          {demoLocations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code} · {l.name.split(" — ")[0] ?? l.name}
            </option>
          ))}
        </Select>
        <Btn size="sm" variant="primary" icon="plus" style={{ marginLeft: "auto" }} onClick={fake}>
          Invite member
        </Btn>
      </Toolbar>

      <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "var(--gap)" }}>
        <Card style={{ overflow: "hidden" }}>
          {members.length === 0 ? (
            <Empty
              icon="users"
              title={hasFilters ? "No members found" : "Invite your first team member"}
              sub={hasFilters ? "Try adjusting your filters." : "Send an invitation to start building your team."}
            />
          ) : (
            <MembersTable
              members={members}
              actor={DEMO_ACTOR}
              actions={{
                onView: setDetailsFor,
                onChangeRole: fake,
                onAssignLocations: fake,
                onResend: fake,
                onToggleStatus: fake,
                onRemove: fake,
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
              <RolesCard roles={demoRoles} />
            </TabPanel>
            <TabPanel value="matrix">
              <PermissionMatrix roles={demoRoles} />
            </TabPanel>
            <TabPanel value="audit">
              <AuditList entries={demoAudit} />
            </TabPanel>
          </Tabs>
        </Card>
      </div>

      <UserDetailsDrawer member={detailsFor} audit={demoAudit} onClose={() => setDetailsFor(null)} />
    </Page>
  );
}
