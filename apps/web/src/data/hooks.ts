"use client";

/**
 * React Query hooks for every resource.
 *
 * Conventions
 *  - query keys come from `qk` below; mutations invalidate by key prefix
 *  - hooks return API types as-is (see ./types); no client-side reshaping
 *  - mutations never toast: the calling component decides what to tell the
 *    user (success message, translated error via useApiError)
 */
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  attachmentsApi,
  auditApi,
  authApi,
  companyApi,
  dashboardApi,
  exchangeApi,
  filesApi,
  issuesApi,
  labelsApi,
  maintenanceApi,
  notificationsApi,
  panelsApi,
  revisionsApi,
  searchApi,
  treeApi,
  usersApi,
  type AuditQuery,
} from "./api";
import type * as T from "./types";

export const qk = {
  me: ["me"] as const,
  company: ["company"] as const,
  locations: ["locations"] as const,
  members: (q?: object) => ["members", q ?? {}] as const,
  roles: ["roles"] as const,
  audit: (q?: object) => ["audit", q ?? {}] as const,
  auditVerify: ["audit", "verify"] as const,
  tree: ["tree"] as const,
  panels: (q?: object) => ["panels", "list", q ?? {}] as const,
  panel: (id: string) => ["panels", "detail", id] as const,
  panelScans: (id: string) => ["panels", "detail", id, "scans"] as const,
  cabinets: (panelId: string) => ["panels", "detail", panelId, "cabinets"] as const,
  revisions: (panelId: string) => ["revisions", "panel", panelId] as const,
  revisionQueue: (filter: string) => ["revisions", "queue", filter] as const,
  sheets: (panelId: string, revisionId?: string) =>
    ["revisions", "sheets", panelId, revisionId ?? "latest"] as const,
  bom: (revisionId: string) => ["revisions", "bom", revisionId] as const,
  fileUrl: (fileId: string) => ["files", fileId] as const,
  issues: (q?: object) => ["issues", "list", q ?? {}] as const,
  panelIssues: (panelId: string) => ["issues", "panel", panelId] as const,
  issue: (id: string) => ["issues", "detail", id] as const,
  maintenance: (q?: object) => ["maintenance", "list", q ?? {}] as const,
  panelMaintenance: (panelId: string) => ["maintenance", "panel", panelId] as const,
  plans: (q?: object) => ["maintenance", "plans", q ?? {}] as const,
  attachments: (panelId: string, q?: object) => ["attachments", panelId, q ?? {}] as const,
  dashboard: ["dashboard"] as const,
  notifications: (q?: object) => ["notifications", "list", q ?? {}] as const,
  unread: ["notifications", "unread"] as const,
  search: (q: string) => ["search", q] as const,
  labelTemplates: ["label-templates"] as const,
  labelTemplate: (id: string) => ["label-templates", id] as const,
};

/** Everything that shows panel-derived state (tree, lists, detail, dashboard). */
function invalidatePanels(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["panels"] });
  void qc.invalidateQueries({ queryKey: qk.tree });
  void qc.invalidateQueries({ queryKey: qk.dashboard });
}

// ── Session ────────────────────────────────────────────────────────────────
export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: authApi.me, staleTime: 60_000 });
}

/** Permission check for the active company. `can("crud_panels")`. */
export function usePermissions() {
  const { data } = useMe();
  const set = new Set(data?.permissions ?? []);
  return {
    role: data?.role ?? null,
    ready: data !== undefined,
    can: (perm: T.Permission) => set.has(perm),
  };
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (me) => qc.setQueryData(qk.me, me),
  });
}

// ── Company / locations ────────────────────────────────────────────────────
export function useCompany() {
  return useQuery({ queryKey: qk.company, queryFn: companyApi.get, staleTime: 60_000 });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companyApi.update,
    onSuccess: (company) => qc.setQueryData(qk.company, company),
  });
}

export function useLocations() {
  return useQuery({ queryKey: qk.locations, queryFn: companyApi.locations, staleTime: 60_000 });
}

export function useLocationMutations() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: qk.locations });
    invalidatePanels(qc);
  };
  return {
    create: useMutation({ mutationFn: companyApi.createLocation, onSuccess: done }),
    update: useMutation({
      mutationFn: (v: { id: string; body: Parameters<typeof companyApi.updateLocation>[1] }) =>
        companyApi.updateLocation(v.id, v.body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: companyApi.deleteLocation, onSuccess: done }),
  };
}

// ── Members ────────────────────────────────────────────────────────────────
export function useMembers(query?: Parameters<typeof usersApi.list>[0]) {
  return useQuery({ queryKey: qk.members(query), queryFn: () => usersApi.list(query) });
}

export function useRoles() {
  return useQuery({ queryKey: qk.roles, queryFn: usersApi.roles, staleTime: 5 * 60_000 });
}

export function useMemberMutations() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["members"] });
    void qc.invalidateQueries({ queryKey: qk.roles });
  };
  return {
    invite: useMutation({ mutationFn: usersApi.invite, onSuccess: done }),
    resend: useMutation({ mutationFn: usersApi.resendInvite, onSuccess: done }),
    changeRole: useMutation({
      mutationFn: (v: { id: string; role: T.Role }) => usersApi.changeRole(v.id, v.role),
      onSuccess: done,
    }),
    changeStatus: useMutation({
      mutationFn: (v: { id: string; status: "active" | "suspended" }) =>
        usersApi.changeStatus(v.id, v.status),
      onSuccess: done,
    }),
    setLocations: useMutation({
      mutationFn: (v: { id: string; locationIds: string[] }) =>
        usersApi.setLocations(v.id, v.locationIds),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: usersApi.remove, onSuccess: done }),
  };
}

export function useAuditLog(query?: AuditQuery, enabled = true) {
  return useQuery({
    queryKey: qk.audit(query),
    queryFn: () => auditApi.list(query),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useAuditVerify(enabled: boolean) {
  return useQuery({ queryKey: qk.auditVerify, queryFn: auditApi.verify, enabled, staleTime: 0 });
}

// ── Hierarchy ──────────────────────────────────────────────────────────────
export function useTree() {
  return useQuery({ queryKey: qk.tree, queryFn: treeApi.tree });
}

export function useTreeMutations() {
  const qc = useQueryClient();
  const done = () => invalidatePanels(qc);
  return {
    createProject: useMutation({ mutationFn: treeApi.createProject, onSuccess: done }),
    updateProject: useMutation({
      mutationFn: (v: { id: string; body: T.ProjectUpdate }) => treeApi.updateProject(v.id, v.body),
      onSuccess: done,
    }),
    archiveProject: useMutation({ mutationFn: treeApi.archiveProject, onSuccess: done }),
    createGroup: useMutation({
      mutationFn: (v: { projectId: string; body: T.SystemGroupCreate }) =>
        treeApi.createGroup(v.projectId, v.body),
      onSuccess: done,
    }),
    updateGroup: useMutation({
      mutationFn: (v: { id: string; body: T.SystemGroupUpdate }) =>
        treeApi.updateGroup(v.id, v.body),
      onSuccess: done,
    }),
    deleteGroup: useMutation({ mutationFn: treeApi.deleteGroup, onSuccess: done }),
  };
}

// ── Panels ─────────────────────────────────────────────────────────────────
/** All visible panels (pages through the API; fine up to a few thousand rows). */
export function usePanels(query?: { q?: string; location_id?: string }) {
  return useQuery({
    queryKey: qk.panels(query),
    queryFn: async () => {
      const all: T.Panel[] = [];
      let cursor: string | undefined;
      do {
        const page = await panelsApi.list({ ...query, cursor, limit: 200 });
        all.push(...page.items);
        cursor = page.next_cursor ?? undefined;
      } while (cursor && all.length < 5000);
      return all;
    },
    placeholderData: keepPreviousData,
  });
}

export function usePanel(id: string | undefined) {
  return useQuery({
    queryKey: qk.panel(id ?? ""),
    queryFn: () => panelsApi.get(id!),
    enabled: !!id,
  });
}

export function usePanelScans(id: string | undefined) {
  return useQuery({
    queryKey: qk.panelScans(id ?? ""),
    queryFn: async () => (await panelsApi.activity(id!)).scans ?? [],
    enabled: !!id,
  });
}

export function usePanelMutations() {
  const qc = useQueryClient();
  const done = () => invalidatePanels(qc);
  return {
    create: useMutation({ mutationFn: panelsApi.create, onSuccess: done }),
    update: useMutation({
      mutationFn: (v: { id: string; body: T.PanelUpdate }) => panelsApi.update(v.id, v.body),
      onSuccess: done,
    }),
    archive: useMutation({ mutationFn: panelsApi.archive, onSuccess: done }),
  };
}

export function useCabinets(panelId: string | undefined) {
  return useQuery({
    queryKey: qk.cabinets(panelId ?? ""),
    queryFn: () => panelsApi.cabinets(panelId!),
    enabled: !!panelId,
  });
}

export function useCabinetMutations() {
  const qc = useQueryClient();
  const done = () => invalidatePanels(qc);
  return {
    create: useMutation({
      mutationFn: (v: { panelId: string; body: Parameters<typeof panelsApi.createCabinet>[1] }) =>
        panelsApi.createCabinet(v.panelId, v.body),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; body: Parameters<typeof panelsApi.updateCabinet>[1] }) =>
        panelsApi.updateCabinet(v.id, v.body),
      onSuccess: done,
    }),
    move: useMutation({
      mutationFn: (v: { id: string; panelId: string }) => panelsApi.moveCabinet(v.id, v.panelId),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: panelsApi.deleteCabinet, onSuccess: done }),
  };
}

// ── Revisions / sheets / BOM ───────────────────────────────────────────────
export function useRevisions(panelId: string | undefined) {
  return useQuery({
    queryKey: qk.revisions(panelId ?? ""),
    queryFn: () => revisionsApi.forPanel(panelId!),
    enabled: !!panelId,
  });
}

export function useRevisionQueue(filter: Parameters<typeof revisionsApi.queue>[0] = "all") {
  return useQuery({
    queryKey: qk.revisionQueue(filter),
    queryFn: () => revisionsApi.queue(filter),
  });
}

export function useRevisionMutations() {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["revisions"] });
    invalidatePanels(qc);
    void qc.invalidateQueries({ queryKey: qk.unread });
  };
  return {
    create: useMutation({
      mutationFn: (v: { panelId: string; summary?: string | null }) =>
        revisionsApi.create(v.panelId, v.summary),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; summary: string | null }) =>
        revisionsApi.update(v.id, v.summary),
      onSuccess: done,
    }),
    submit: useMutation({ mutationFn: revisionsApi.submit, onSuccess: done }),
    approve: useMutation({
      mutationFn: (v: { id: string; note?: string | null }) => revisionsApi.approve(v.id, v.note),
      onSuccess: done,
    }),
    reject: useMutation({
      mutationFn: (v: { id: string; note?: string | null }) => revisionsApi.reject(v.id, v.note),
      onSuccess: done,
    }),
  };
}

/** Sheets of a revision (omit revisionId for the panel's newest revision). */
export function useSheets(panelId: string | undefined, revisionId?: string) {
  return useQuery({
    queryKey: qk.sheets(panelId ?? "", revisionId),
    queryFn: () => revisionsApi.sheets(panelId!, revisionId),
    enabled: !!panelId,
  });
}

export function useSheetMutations(panelId: string) {
  const qc = useQueryClient();
  const done = () => {
    void qc.invalidateQueries({ queryKey: ["revisions"] });
    void qc.invalidateQueries({ queryKey: qk.panel(panelId) });
  };
  return {
    attach: useMutation({
      mutationFn: (v: {
        revisionId: string;
        body: Parameters<typeof revisionsApi.attachSheet>[2];
      }) => revisionsApi.attachSheet(panelId, v.revisionId, v.body),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; body: Parameters<typeof revisionsApi.updateSheet>[1] }) =>
        revisionsApi.updateSheet(v.id, v.body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: revisionsApi.deleteSheet, onSuccess: done }),
  };
}

/** Signed URL of a stored file (cached below its 1h lifetime). */
export function useFileUrl(fileId: string | undefined) {
  return useQuery({
    queryKey: qk.fileUrl(fileId ?? ""),
    queryFn: async () => (await filesApi.url(fileId!)).url,
    enabled: !!fileId,
    staleTime: 45 * 60_000,
    gcTime: 50 * 60_000,
  });
}

export function useBom(revisionId: string | undefined) {
  return useQuery({
    queryKey: qk.bom(revisionId ?? ""),
    queryFn: () => revisionsApi.bom(revisionId!),
    enabled: !!revisionId,
  });
}

export function useBomMutations(revisionId: string) {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ["revisions"] });
  return {
    add: useMutation({
      mutationFn: (body: T.BomItemCreate) => revisionsApi.addBomItem(revisionId, body),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; body: Partial<T.BomItemCreate> }) =>
        revisionsApi.updateBomItem(v.id, v.body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: revisionsApi.deleteBomItem, onSuccess: done }),
    importCsv: useMutation({
      mutationFn: (file: File) => revisionsApi.importBom(revisionId, file),
      onSuccess: done,
    }),
  };
}

// ── Issues ─────────────────────────────────────────────────────────────────
function invalidateFieldwork(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["issues"] });
  void qc.invalidateQueries({ queryKey: ["maintenance"] });
  void qc.invalidateQueries({ queryKey: ["attachments"] });
  invalidatePanels(qc);
}

export function useIssues(query?: Parameters<typeof issuesApi.list>[0]) {
  return useQuery({
    queryKey: qk.issues(query),
    queryFn: () => issuesApi.list(query),
    placeholderData: keepPreviousData,
  });
}

export function usePanelIssues(panelId: string | undefined) {
  return useQuery({
    queryKey: qk.panelIssues(panelId ?? ""),
    queryFn: () => issuesApi.forPanel(panelId!),
    enabled: !!panelId,
  });
}

export function useIssue(id: string | undefined) {
  return useQuery({
    queryKey: qk.issue(id ?? ""),
    queryFn: () => issuesApi.get(id!),
    enabled: !!id,
  });
}

export function useIssueMutations() {
  const qc = useQueryClient();
  const done = () => invalidateFieldwork(qc);
  return {
    create: useMutation({
      mutationFn: (v: { panelId: string; body: T.IssueCreate }) =>
        issuesApi.create(v.panelId, v.body),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: (v: { id: string; body: T.IssueUpdate }) => issuesApi.update(v.id, v.body),
      onSuccess: done,
    }),
  };
}

// ── Maintenance ────────────────────────────────────────────────────────────
export function useRecentMaintenance(limit = 50) {
  return useQuery({
    queryKey: qk.maintenance({ limit }),
    queryFn: () => maintenanceApi.recent({ limit }),
  });
}

export function usePanelMaintenance(panelId: string | undefined) {
  return useQuery({
    queryKey: qk.panelMaintenance(panelId ?? ""),
    queryFn: () => maintenanceApi.forPanel(panelId!),
    enabled: !!panelId,
  });
}

export function useMaintenancePlans(query?: Parameters<typeof maintenanceApi.plans>[0]) {
  return useQuery({ queryKey: qk.plans(query), queryFn: () => maintenanceApi.plans(query) });
}

export function useMaintenanceMutations() {
  const qc = useQueryClient();
  const done = () => invalidateFieldwork(qc);
  return {
    record: useMutation({
      mutationFn: (v: { panelId: string; body: T.MaintenanceCreate }) =>
        maintenanceApi.record(v.panelId, v.body),
      onSuccess: done,
    }),
    createPlan: useMutation({
      mutationFn: (v: { panelId: string; body: T.PlanCreate }) =>
        maintenanceApi.createPlan(v.panelId, v.body),
      onSuccess: done,
    }),
    updatePlan: useMutation({
      mutationFn: (v: { id: string; body: T.PlanUpdate }) => maintenanceApi.updatePlan(v.id, v.body),
      onSuccess: done,
    }),
    deletePlan: useMutation({ mutationFn: maintenanceApi.deletePlan, onSuccess: done }),
  };
}

// ── Attachments ────────────────────────────────────────────────────────────
export function useAttachments(
  panelId: string | undefined,
  query?: Parameters<typeof attachmentsApi.forPanel>[1],
) {
  return useQuery({
    queryKey: qk.attachments(panelId ?? "", query),
    queryFn: () => attachmentsApi.forPanel(panelId!, query),
    enabled: !!panelId,
  });
}

export function useAttachmentMutations() {
  const qc = useQueryClient();
  const done = () => invalidateFieldwork(qc);
  return {
    add: useMutation({
      mutationFn: (v: { panelId: string; body: Parameters<typeof attachmentsApi.add>[1] }) =>
        attachmentsApi.add(v.panelId, v.body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: attachmentsApi.remove, onSuccess: done }),
  };
}

// ── Dashboard / notifications / search ─────────────────────────────────────
export function useDashboard() {
  return useQuery({ queryKey: qk.dashboard, queryFn: dashboardApi.get, staleTime: 30_000 });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: qk.unread,
    queryFn: async () => (await notificationsApi.unreadCount()).unread,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications(enabled: boolean, unreadOnly = false) {
  return useQuery({
    queryKey: qk.notifications({ unreadOnly }),
    queryFn: () => notificationsApi.list({ unread_only: unreadOnly, limit: 30 }),
    enabled,
  });
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: ["notifications"] });
  return {
    read: useMutation({ mutationFn: notificationsApi.read, onSuccess: done }),
    readAll: useMutation({ mutationFn: notificationsApi.readAll, onSuccess: done }),
  };
}

export function useSearch(q: string) {
  const term = q.trim();
  return useQuery({
    queryKey: qk.search(term),
    queryFn: async () => (await searchApi.search(term)).items,
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

// ── Import ─────────────────────────────────────────────────────────────────
export function useImportPanels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { file: File; dryRun: boolean }) => exchangeApi.importPanels(v.file, v.dryRun),
    onSuccess: (result) => {
      if (result.committed) invalidatePanels(qc);
    },
  });
}

// ── Labels ─────────────────────────────────────────────────────────────────
export function useLabelTemplates() {
  return useQuery({ queryKey: qk.labelTemplates, queryFn: labelsApi.templates });
}

export function useLabelTemplate(id: string | undefined) {
  return useQuery({
    queryKey: qk.labelTemplate(id ?? ""),
    queryFn: () => labelsApi.template(id!),
    enabled: !!id,
  });
}

export function useLabelTemplateMutations() {
  const qc = useQueryClient();
  const done = () => void qc.invalidateQueries({ queryKey: qk.labelTemplates });
  return {
    create: useMutation({ mutationFn: labelsApi.createTemplate, onSuccess: done }),
    update: useMutation({
      mutationFn: (v: { id: string; body: T.LabelTemplateUpdate }) =>
        labelsApi.updateTemplate(v.id, v.body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: labelsApi.deleteTemplate, onSuccess: done }),
    setDefault: useMutation({ mutationFn: labelsApi.setDefaultTemplate, onSuccess: done }),
  };
}
