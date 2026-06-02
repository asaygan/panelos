"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { queryKeys } from "./keys";
import {
  auth,
  company as companyApi,
  componentsApi,
  cabinets,
  files,
  labels,
  labelTemplates,
  locations,
  panels,
  projects,
  revisions,
  search as searchApi,
  systemGroups,
  users,
  type LabelTemplateDTO,
  type RevisionDTO,
  type RoleEnum,
  type UserListParams,
} from "@/lib/api/endpoints";
import type { components as ApiComponents } from "@panelos/types/generated";
import {
  activityToView,
  auditToView,
  cabinetToView,
  componentToView,
  locationToView,
  panelToView,
  projectToView,
  revisionRequestToView,
  revisionToView,
  roleToView,
  searchHitToView,
  sheetToView,
  treeToView,
  userToView,
  type PanelViewContext,
} from "@/lib/api/adapters";
import type { UserNameMap } from "@/lib/api/adapters";
import type {
  AuditEntry,
  Cabinet,
  Component,
  Location,
  Member,
  Panel,
  Project,
  ProjectNode,
  Revision,
  RoleView,
  Sheet,
} from "@/lib/api/types";

type Schemas = ApiComponents["schemas"];

/**
 * Best-effort user_id → name map for resolving actor UUIDs inside queryFns.
 * The members list needs admin scope; on failure we return {} so views fall back
 * to "—" rather than ever showing a raw UUID.
 */
async function fetchUserNameMap(): Promise<UserNameMap> {
  try {
    const members = await users.list();
    const map: UserNameMap = {};
    for (const m of members) map[m.user_id] = m.name || m.email;
    return map;
  } catch {
    return {};
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export function useLocations(): UseQueryResult<Location[]> {
  return useQuery({
    queryKey: queryKeys.locations.all(),
    queryFn: async () => (await locations.list()).map(locationToView),
    staleTime: 5 * 60_000,
  });
}

/** Panels list, mapped to the view-model with location names resolved. */
export function usePanels(
  params?: Parameters<typeof panels.list>[0],
): UseQueryResult<Panel[]> {
  return useQuery({
    queryKey: queryKeys.panels.list(params),
    queryFn: async () => {
      const [items, locs, userMap] = await Promise.all([
        panels.list(params),
        locations.list(),
        fetchUserNameMap(),
      ]);
      return items.map((p) => panelToView(p, { locations: locs, users: userMap }));
    },
  });
}

/** The Project → System Group → Panel → Cabinet tree (default panels view). */
export function useTree(): UseQueryResult<{ projects: ProjectNode[]; unassigned: Panel[] }> {
  return useQuery({
    queryKey: queryKeys.projects.tree(),
    queryFn: async () => {
      const [dto, locs, userMap] = await Promise.all([
        projects.tree(),
        locations.list(),
        fetchUserNameMap(),
      ]);
      return treeToView(dto, { locations: locs, users: userMap });
    },
  });
}

export function useProjects(): UseQueryResult<Project[]> {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: async () => (await projects.list()).map(projectToView),
    staleTime: 60_000,
  });
}

export function usePanelCabinets(panelId: string): UseQueryResult<Cabinet[]> {
  return useQuery({
    queryKey: queryKeys.cabinets.forPanel(panelId),
    enabled: !!panelId,
    queryFn: async () => (await cabinets.list(panelId)).map(cabinetToView),
  });
}

function invalidateTreeAndCabinets(qc: ReturnType<typeof useQueryClient>, panelId?: string) {
  qc.invalidateQueries({ queryKey: queryKeys.projects.tree() });
  if (panelId) qc.invalidateQueries({ queryKey: queryKeys.cabinets.forPanel(panelId) });
}

// ─── Projects ──────────────────────────────────────────────────────────────

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["ProjectCreateIn"]) => projects.create(body),
    onSuccess: () => invalidateTreeAndCabinets(qc),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Schemas["ProjectUpdateIn"] }) =>
      projects.update(id, body),
    onSuccess: () => invalidateTreeAndCabinets(qc),
  });
}

export function useArchiveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projects.archive(id),
    onSuccess: () => invalidateTreeAndCabinets(qc),
  });
}

// ─── System Groups ─────────────────────────────────────────────────────────

export function useCreateSystemGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, body }: { projectId: string; body: Schemas["SystemGroupCreateIn"] }) =>
      projects.createGroup(projectId, body),
    onSuccess: () => invalidateTreeAndCabinets(qc),
  });
}

export function useUpdateSystemGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Schemas["SystemGroupUpdateIn"] }) =>
      systemGroups.update(id, body),
    onSuccess: () => invalidateTreeAndCabinets(qc),
  });
}

export function useDeleteSystemGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => systemGroups.remove(id),
    onSuccess: () => invalidateTreeAndCabinets(qc),
  });
}

// ─── Cabinets ──────────────────────────────────────────────────────────────

export function useCreateCabinet(panelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CabinetCreateIn"]) => cabinets.create(panelId, body),
    onSuccess: () => invalidateTreeAndCabinets(qc, panelId),
  });
}

/** Tree-level inline-add: create a cabinet under a panel chosen at call-time. */
export function useCreateCabinetAny() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ panel_id, body }: { panel_id: string; body: Schemas["CabinetCreateIn"] }) =>
      cabinets.create(panel_id, body),
    onSuccess: (_d, { panel_id }) => invalidateTreeAndCabinets(qc, panel_id),
  });
}

/** Drag-to-move: reparent a cabinet to a different panel. */
export function useMoveCabinet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cabinet_id, panel_id }: { cabinet_id: string; panel_id: string }) =>
      cabinets.move(cabinet_id, { panel_id }),
    onSuccess: (_d, { panel_id }) => invalidateTreeAndCabinets(qc, panel_id),
  });
}

export function useUpdateCabinet(panelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Schemas["CabinetUpdateIn"] }) =>
      cabinets.update(id, body),
    onSuccess: () => invalidateTreeAndCabinets(qc, panelId),
  });
}

export function useDeleteCabinet(panelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cabinets.remove(id),
    onSuccess: () => invalidateTreeAndCabinets(qc, panelId),
  });
}

/** Single panel with full context (location name, revision letter/count, comp count). */
export function usePanel(id: string): UseQueryResult<Panel> {
  return useQuery({
    queryKey: queryKeys.panels.detail(id),
    enabled: !!id,
    queryFn: async () => {
      const [dto, locs, revs, comps, userMap] = await Promise.all([
        panels.get(id),
        locations.list(),
        panels.revisions(id),
        panels.components(id),
        fetchUserNameMap(),
      ]);
      const ctx: PanelViewContext = {
        locations: locs,
        revisions: revs,
        componentCount: comps.length,
        users: userMap,
      };
      return panelToView(dto, ctx);
    },
  });
}

export function usePanelComponents(id: string): UseQueryResult<Component[]> {
  return useQuery({
    queryKey: queryKeys.panels.components(id),
    enabled: !!id,
    queryFn: async () => (await panels.components(id)).map(componentToView),
  });
}

export function usePanelRevisions(id: string): UseQueryResult<Revision[]> {
  return useQuery({
    queryKey: queryKeys.panels.revisions(id),
    enabled: !!id,
    queryFn: async () => {
      const [revs, userMap] = await Promise.all([panels.revisions(id), fetchUserNameMap()]);
      return revs.map((r) => revisionToView(r, 0, userMap));
    },
  });
}

export function usePanelSheets(id: string, revisionId?: string): UseQueryResult<Sheet[]> {
  return useQuery({
    queryKey: [...queryKeys.panels.sheets(id), revisionId ?? "latest"],
    enabled: !!id,
    queryFn: async () => (await panels.sheets(id, revisionId)).map(sheetToView),
  });
}

export interface SheetFileView {
  id: string;
  fileId: string;
  key: string;
  n: string;
  title: string;
}

/** Sheet DTOs enriched with resolved storage URLs for the PDF viewer + actions. */
export function usePanelSheetFiles(id: string, revisionId?: string): UseQueryResult<SheetFileView[]> {
  return useQuery({
    queryKey: [...queryKeys.panels.sheets(id), revisionId ?? "latest", "files"],
    enabled: !!id,
    queryFn: async () => {
      const sheets = await panels.sheets(id, revisionId);
      return Promise.all(
        sheets.map(async (s) => {
          let key = "";
          try {
            const f = await files.get(s.file_id);
            key = f.url;
          } catch {
            key = "";
          }
          return {
            id: s.id,
            fileId: s.file_id,
            key,
            n: String(s.sheet_number ?? "").padStart(3, "0"),
            title: s.sheet_title ?? "Untitled",
          };
        }),
      );
    },
  });
}

export function useRenameSheet(panelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sheetId, body }: { sheetId: string; body: { sheet_number?: string; sheet_title?: string } }) =>
      files.updateSheet(sheetId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.panels.sheets(panelId) }),
  });
}

export function useDeleteSheet(panelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sheetId: string) => files.deleteSheet(sheetId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.panels.sheets(panelId) }),
  });
}

export function usePanelActivity(id: string) {
  return useQuery({
    queryKey: queryKeys.panels.activity(id),
    enabled: !!id,
    queryFn: async () => {
      const res = await panels.activity(id);
      return (res.scans ?? []).map(activityToView);
    },
  });
}

/** Revision queue, mapped to RevisionRequest with panel tag/name resolved. */
export function useRevisionQueue(filter?: "draft" | "review" | "all") {
  return useQuery({
    queryKey: queryKeys.revisions.queue(filter),
    queryFn: async () => {
      const [queue, panelList, userMap] = await Promise.all([
        revisions.queue(filter),
        panels.list(),
        fetchUserNameMap(),
      ]);
      return queue.map((r) => revisionRequestToView(r, panelList, userMap));
    },
  });
}

export function useUsers(filters?: UserListParams): UseQueryResult<Member[]> {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: async () => (await users.list(filters)).map(userToView),
  });
}

/**
 * user_id → display name map for resolving actor UUIDs in revision/audit views.
 * Best-effort: the members list requires admin scope, so failures resolve to an
 * empty map (callers then render "—" instead of a raw UUID — never the UUID).
 */
export function useUserNameMap(): UseQueryResult<UserNameMap> {
  return useQuery({
    queryKey: [...queryKeys.users.all(), "name-map"],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: fetchUserNameMap,
  });
}

export function useRoles(): UseQueryResult<RoleView[]> {
  return useQuery({
    queryKey: queryKeys.roles.all(),
    queryFn: async () => (await users.roles()).map(roleToView),
    staleTime: 5 * 60_000,
  });
}

export function useUserAuditLogs(limit = 30): UseQueryResult<AuditEntry[]> {
  return useQuery({
    queryKey: queryKeys.auditLogs.all({ target_type: "membership", limit }),
    queryFn: async () =>
      (await users.auditLogs({ target_type: "membership", limit })).map(auditToView),
  });
}

export function useCompany() {
  return useQuery({
    queryKey: queryKeys.company.me(),
    queryFn: () => companyApi.get(),
    staleTime: 5 * 60_000,
  });
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.search(q),
    enabled: q.trim().length > 0,
    queryFn: async () => (await searchApi(q)).map(searchHitToView),
  });
}

export function useLabelTemplates(): UseQueryResult<LabelTemplateDTO[]> {
  return useQuery({
    queryKey: queryKeys.labelTemplates.all(),
    queryFn: () => labelTemplates.list(),
  });
}

/** Convenience: dashboard activity (most recent scans across attention panels). */
export function useActivity(panelIds: string[]) {
  return useQueries({
    queries: panelIds.map((id) => ({
      queryKey: queryKeys.panels.activity(id),
      queryFn: async () => (await panels.activity(id)).scans ?? [],
      enabled: !!id,
    })),
    combine: (results) =>
      results
        .flatMap((r) => r.data ?? [])
        .map(activityToView)
        .slice(0, 8),
  });
}

// ── Mutations ──────────────────────────────────────────────────────────────────

export function useCreateRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ panelId, change_summary }: { panelId: string; change_summary: string }) =>
      revisions.create(panelId, change_summary),
    onSuccess: (_d, { panelId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.panels.revisions(panelId) });
      qc.invalidateQueries({ queryKey: queryKeys.panels.detail(panelId) });
      qc.invalidateQueries({ queryKey: ["revisions"] });
    },
  });
}

export function useTransitionRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      note,
    }: {
      id: string;
      action: "submit" | "approve" | "reject";
      note?: string;
    }): Promise<RevisionDTO> => {
      if (action === "submit") return revisions.submit(id);
      if (action === "approve") return revisions.approve(id, note);
      return revisions.reject(id, note);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revisions"] });
      qc.invalidateQueries({ queryKey: ["panels"] });
    },
  });
}

export function useAddComponent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      revisionId,
      body,
    }: {
      revisionId: string;
      body: Schemas["ComponentCreateIn"];
    }) => componentsApi.add(revisionId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["panels"] }),
  });
}

export function useImportBom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ revisionId, file }: { revisionId: string; file: File }) =>
      componentsApi.import(revisionId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["panels"] }),
  });
}

export function usePresignUpload() {
  return useMutation({
    mutationFn: ({ filename, contentType }: { filename: string; contentType?: string }) =>
      files.presign(filename, contentType),
  });
}

export function useAttachSheet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      panelId,
      revisionId,
      body,
    }: {
      panelId: string;
      revisionId: string;
      body: Schemas["AttachSheetIn"];
    }) => files.attachSheet(panelId, revisionId, body),
    onSuccess: (_d, { panelId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.panels.sheets(panelId) });
    },
  });
}

export function useRenderLabel() {
  return useMutation({
    mutationFn: (body: Schemas["LabelRenderIn"]) => labels.render(body),
  });
}

export function useBatchLabels() {
  return useMutation({
    mutationFn: ({ panelIds, template }: { panelIds: string[]; template?: string }) =>
      labels.batch(panelIds, template),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["CompanyUpdateIn"]) => companyApi.update(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.company.me() }),
  });
}

export function useCreateLabelTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["LabelTemplateCreateIn"]) => labelTemplates.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.labelTemplates.all() }),
  });
}

export function useUpdateLabelTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Schemas["LabelTemplateUpdateIn"] }) =>
      labelTemplates.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.labelTemplates.all() }),
  });
}

export function useDeleteLabelTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => labelTemplates.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.labelTemplates.all() }),
  });
}

export function useSetDefaultTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => labelTemplates.setDefault(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.labelTemplates.all() }),
  });
}

function invalidateUsers(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: queryKeys.users.all() });
  qc.invalidateQueries({ queryKey: queryKeys.roles.all() });
  qc.invalidateQueries({ queryKey: queryKeys.auditLogs.all() });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      email: string;
      role: RoleEnum;
      location_ids?: string[];
      message?: string;
    }) => users.invite(body),
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useChangeRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: string; role: RoleEnum }) =>
      users.changeRole(membershipId, { role }),
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useChangeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      status,
    }: {
      membershipId: string;
      status: "active" | "suspended";
    }) => users.changeStatus(membershipId, { status }),
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => users.remove(membershipId),
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => users.resendInvite(membershipId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auditLogs.all() }),
  });
}

export function useAssignLocations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      membershipId,
      location_ids,
    }: {
      membershipId: string;
      location_ids: string[];
    }) => users.assignLocations(membershipId, { location_ids }),
    onSuccess: () => invalidateUsers(qc),
  });
}

export function useCreatePanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["PanelCreateIn"]) => panels.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.panels.all() });
      qc.invalidateQueries({ queryKey: queryKeys.projects.tree() });
    },
  });
}

export function useUpdatePanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Schemas["PanelUpdateIn"] }) =>
      panels.update(id, body),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.panels.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.panels.all() });
    },
  });
}

export function useArchivePanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => panels.archive(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.panels.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.panels.all() });
    },
  });
}

export function useCreateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Schemas["LocationCreateIn"]) => locations.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.locations.all() }),
  });
}

export function useUpdateLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Schemas["LocationUpdateIn"] }) =>
      locations.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.locations.all() }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => locations.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.locations.all() }),
  });
}

export function useAuthMe() {
  return useQuery({ queryKey: ["auth", "me"], queryFn: () => auth.me() });
}

function activeCompanyId(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)panelos_company=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : null;
}

export interface CurrentMembership {
  userId: string;
  role: RoleEnum | null;
}

/** The signed-in user's id + role within the active company (from /auth/me + cookie). */
export function useCurrentMembership(): CurrentMembership | null {
  const { data: me } = useAuthMe();
  if (!me) return null;
  const companyId = activeCompanyId();
  const companies = me.companies ?? [];
  const match =
    (companyId && companies.find((c) => String(c.id) === companyId)) ?? companies[0];
  const role = match ? (String(match.role).toLowerCase() as RoleEnum) : null;
  return { userId: me.id, role };
}
