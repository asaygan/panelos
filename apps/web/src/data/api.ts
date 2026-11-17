/**
 * Typed API surface. One function per endpoint, grouped by resource; every
 * call goes through the shared client (cookies, X-Company-Id, 401 refresh).
 */
import { api, apiUrl } from "@/lib/api/client";
import type * as T from "./types";

type Id = string;
const enc = encodeURIComponent;

export const authApi = {
  me: () => api.get<T.Me>("/auth/me"),
  updateProfile: (body: {
    name?: string;
    locale?: string;
    notification_prefs?: Record<string, Record<string, boolean>>;
  }) => api.patch<T.Me>("/auth/me", body),
  forgotPassword: (email: string) => api.post<{ ok: boolean }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ ok: boolean }>("/auth/reset-password", { token, password }),
  changePassword: (current_password: string, new_password: string) =>
    api.post<{ ok: boolean }>("/auth/change-password", { current_password, new_password }),
  logoutAll: () => api.post<{ ok: boolean }>("/auth/logout-all"),
  mfaSetup: () => api.post<{ secret: string; otpauth_url: string }>("/auth/mfa/setup"),
  mfaEnable: (code: string) => api.post<{ recovery_codes: string[] }>("/auth/mfa/enable", { code }),
  mfaDisable: (password: string) => api.post<{ ok: boolean }>("/auth/mfa/disable", { password }),
};

export const companyApi = {
  get: () => api.get<T.Company>("/companies/me"),
  update: (body: T.CompanyUpdate) => api.put<T.Company>("/companies/me", body),
  /** `<img src>` for the logo; pass the logo key as a cache-buster. */
  logoUrl: (version?: string | null) =>
    apiUrl("/companies/me/logo", version ? { v: version } : undefined),
  locations: () => api.get<T.Location[]>("/companies/me/locations"),
  createLocation: (body: { code: string; name: string; region?: string | null }) =>
    api.post<T.Location>("/companies/me/locations", body),
  updateLocation: (id: Id, body: { code?: string; name?: string; region?: string | null }) =>
    api.put<T.Location>(`/companies/me/locations/${id}`, body),
  deleteLocation: (id: Id) => api.delete<void>(`/companies/me/locations/${id}`),
};

export const usersApi = {
  list: (query?: { search?: string; role?: T.Role; status?: string }) =>
    api.get<T.Member[]>("/users", { query }),
  roles: () => api.get<T.RoleInfo[]>("/roles"),
  invite: (body: { email: string; role: T.Role; location_ids?: Id[]; message?: string | null }) =>
    api.post<{ id: Id; email: string; role: T.Role; token: string }>("/users/invitations", body),
  resendInvite: (membershipId: Id) =>
    api.post<unknown>(`/users/${membershipId}/resend-invitation`),
  changeRole: (membershipId: Id, role: T.Role) =>
    api.patch<unknown>(`/users/${membershipId}/role`, { role }),
  changeStatus: (membershipId: Id, status: "active" | "suspended") =>
    api.patch<unknown>(`/users/${membershipId}/status`, { status }),
  setLocations: (membershipId: Id, location_ids: Id[]) =>
    api.put<unknown>(`/users/${membershipId}/locations`, { location_ids }),
  remove: (membershipId: Id) => api.delete<void>(`/users/${membershipId}`),
};

export interface AuditQuery {
  action?: string;
  target_type?: string;
  target_id?: string;
  actor_id?: string;
  since?: string;
  until?: string;
  before?: string;
  limit?: number;
}

export const auditApi = {
  list: (query?: AuditQuery) => api.get<T.AuditLog[]>("/audit-logs", { query: { ...query } }),
  verify: () => api.get<{ valid: boolean }>("/audit-logs/verify"),
};

export const treeApi = {
  tree: () => api.get<T.Tree>("/projects/tree"),
  createProject: (body: T.ProjectCreate) => api.post<T.Project>("/projects", body),
  updateProject: (id: Id, body: T.ProjectUpdate) => api.put<T.Project>(`/projects/${id}`, body),
  archiveProject: (id: Id) => api.delete<void>(`/projects/${id}`),
  createGroup: (projectId: Id, body: T.SystemGroupCreate) =>
    api.post<T.SystemGroup>(`/projects/${projectId}/groups`, body),
  updateGroup: (id: Id, body: T.SystemGroupUpdate) =>
    api.put<T.SystemGroup>(`/system-groups/${id}`, body),
  deleteGroup: (id: Id) => api.delete<void>(`/system-groups/${id}`),
  projectHistory: (id: Id) =>
    api.get<T.ProjectHistory[]>(`/projects/${id}/status-history`),
  groupHistory: (id: Id) =>
    api.get<T.GroupHistory[]>(`/system-groups/${id}/status-history`),
};

export const panelsApi = {
  list: (query?: {
    q?: string;
    location_id?: Id;
    include_archived?: boolean;
    cursor?: string;
    limit?: number;
  }) => api.get<{ items: T.Panel[]; next_cursor: string | null }>("/panels", { query }),
  get: (id: Id) => api.get<T.Panel>(`/panels/${id}`),
  create: (body: T.PanelCreate) => api.post<T.Panel>("/panels", body),
  update: (id: Id, body: T.PanelUpdate) => api.put<T.Panel>(`/panels/${id}`, body),
  archive: (id: Id) => api.delete<void>(`/panels/${id}`),
  activity: (id: Id) => api.get<{ scans: T.ScanEvent[] }>(`/panels/${id}/activity`),
  cabinets: (id: Id) => api.get<T.Cabinet[]>(`/panels/${id}/cabinets`),
  createCabinet: (id: Id, body: { name: string; code?: string | null; notes?: string | null }) =>
    api.post<T.Cabinet>(`/panels/${id}/cabinets`, body),
  updateCabinet: (
    cabinetId: Id,
    body: { name?: string; code?: string | null; notes?: string | null; position?: number },
  ) => api.put<T.Cabinet>(`/cabinets/${cabinetId}`, body),
  moveCabinet: (cabinetId: Id, panelId: Id) =>
    api.post<T.Cabinet>(`/cabinets/${cabinetId}/move`, { panel_id: panelId }),
  deleteCabinet: (cabinetId: Id) => api.delete<void>(`/cabinets/${cabinetId}`),
};

export const revisionsApi = {
  forPanel: (panelId: Id) => api.get<T.Revision[]>(`/panels/${panelId}/revisions`),
  queue: (filter: "all" | "draft" | "review" | "history" | "approved" | "rejected" = "all") =>
    api.get<T.Revision[]>("/revisions", { query: { filter } }),
  get: (id: Id) => api.get<T.Revision>(`/revisions/${id}`),
  create: (panelId: Id, change_summary?: string | null) =>
    api.post<T.Revision>(`/panels/${panelId}/revisions`, { change_summary }),
  update: (id: Id, change_summary: string | null) =>
    api.patch<T.Revision>(`/revisions/${id}`, { change_summary }),
  submit: (id: Id) => api.post<T.Revision>(`/revisions/${id}/submit`),
  approve: (id: Id, note?: string | null) =>
    api.post<T.Revision>(`/revisions/${id}/approve`, { note }),
  reject: (id: Id, note?: string | null) =>
    api.post<T.Revision>(`/revisions/${id}/reject`, { note }),
  sheets: (panelId: Id, revisionId?: Id) =>
    api.get<T.Sheet[]>(`/panels/${panelId}/sheets`, { query: { revision_id: revisionId } }),
  attachSheet: (
    panelId: Id,
    revisionId: Id,
    body: { file_id: Id; sheet_number: string; sheet_title: string; page_index?: number },
  ) => api.post<{ id: Id }>(`/files/panels/${panelId}/revisions/${revisionId}/sheets`, body),
  updateSheet: (sheetId: Id, body: { sheet_number?: string; sheet_title?: string }) =>
    api.patch<T.Sheet>(`/files/sheets/${sheetId}`, body),
  deleteSheet: (sheetId: Id) => api.delete<void>(`/files/sheets/${sheetId}`),
  bom: (revisionId: Id) => api.get<T.BomItem[]>(`/revisions/${revisionId}/components`),
  liveBom: (panelId: Id) => api.get<T.BomItem[]>(`/panels/${panelId}/components`),
  addBomItem: (revisionId: Id, body: T.BomItemCreate) =>
    api.post<T.BomItem>(`/revisions/${revisionId}/components`, body),
  updateBomItem: (id: Id, body: Partial<T.BomItemCreate>) =>
    api.put<T.BomItem>(`/components/${id}`, body),
  deleteBomItem: (id: Id) => api.delete<void>(`/components/${id}`),
  importBom: (revisionId: Id, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<T.BomItem[]>(`/revisions/${revisionId}/components/import`, undefined, {
      rawBody: form,
    });
  },
};

export const filesApi = {
  presign: (filename: string, content_type: string) =>
    api.post<{ url: string; key: string; method: string; headers: Record<string, string> }>(
      "/files/presign",
      { filename, content_type },
    ),
  finalize: (key: string, original_filename: string) =>
    api.post<T.StoredFile>("/files/finalize", { key, original_filename }),
  /** Short-lived signed URL for a stored file. */
  url: (fileId: Id) => api.get<{ url: string }>(`/files/${fileId}`),
};

export const issuesApi = {
  list: (query?: {
    state?: "open" | "closed" | "all";
    severity?: T.Severity;
    panel_id?: Id;
    mine?: boolean;
    limit?: number;
    offset?: number;
  }) => api.get<T.Issue[]>("/issues", { query }),
  forPanel: (panelId: Id) => api.get<T.Issue[]>(`/panels/${panelId}/issues`),
  get: (id: Id) => api.get<T.IssueDetail>(`/issues/${id}`),
  create: (panelId: Id, body: T.IssueCreate) =>
    api.post<T.Issue>(`/panels/${panelId}/issues`, body),
  update: (id: Id, body: T.IssueUpdate) => api.patch<T.Issue>(`/issues/${id}`, body),
};

export const maintenanceApi = {
  recent: (query?: { limit?: number; offset?: number }) =>
    api.get<T.Maintenance[]>("/maintenance", { query }),
  forPanel: (panelId: Id) => api.get<T.Maintenance[]>(`/panels/${panelId}/maintenance`),
  record: (panelId: Id, body: T.MaintenanceCreate) =>
    api.post<T.Maintenance>(`/panels/${panelId}/maintenance`, body),
  plans: (query?: { due?: "all" | "overdue" | "soon"; panel_id?: Id; include_inactive?: boolean }) =>
    api.get<T.MaintenancePlan[]>("/maintenance-plans", { query }),
  createPlan: (panelId: Id, body: T.PlanCreate) =>
    api.post<T.MaintenancePlan>(`/panels/${panelId}/maintenance-plans`, body),
  updatePlan: (id: Id, body: T.PlanUpdate) =>
    api.patch<T.MaintenancePlan>(`/maintenance-plans/${id}`, body),
  deletePlan: (id: Id) => api.delete<void>(`/maintenance-plans/${id}`),
};

export const attachmentsApi = {
  forPanel: (panelId: Id, query?: { maintenance_id?: Id; only_general?: boolean }) =>
    api.get<T.Attachment[]>(`/panels/${panelId}/attachments`, { query }),
  add: (
    panelId: Id,
    body: { file_id: Id; caption?: string | null; issue_id?: Id | null; maintenance_id?: Id | null },
  ) => api.post<T.Attachment[]>(`/panels/${panelId}/attachments`, body),
  remove: (id: Id) => api.delete<void>(`/attachments/${id}`),
};

export const dashboardApi = {
  get: () => api.get<T.Dashboard>("/dashboard"),
};

export const notificationsApi = {
  list: (query?: { unread_only?: boolean; limit?: number; before?: string }) =>
    api.get<T.NotificationList>("/notifications", { query }),
  unreadCount: () => api.get<{ unread: number }>("/notifications/unread-count"),
  read: (id: Id) => api.post<{ updated: number }>(`/notifications/${id}/read`),
  readAll: () => api.post<{ updated: number }>("/notifications/read-all"),
};

export const searchApi = {
  search: (q: string) => api.get<{ items: T.SearchHit[] }>("/search", { query: { q } }),
};

export type ExportDataset = "panels" | "issues" | "maintenance" | "audit-logs";

export const exchangeApi = {
  /** Download links (use as <a href download>). */
  exportUrl: (dataset: ExportDataset, format: "csv" | "xlsx") =>
    apiUrl(`/export/${dataset}`, { format }),
  bomExportUrl: (panelId: Id, format: "csv" | "xlsx") =>
    apiUrl("/export/components", { panel_id: panelId, format }),
  templateUrl: (format: "csv" | "xlsx") => apiUrl("/import/panels/template", { format }),
  importPanels: (file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<T.ImportResult>("/import/panels", undefined, {
      rawBody: form,
      query: { dry_run: dryRun },
    });
  },
};

export const labelsApi = {
  templates: () => api.get<T.LabelTemplate[]>("/label-templates"),
  template: (id: Id) => api.get<T.LabelTemplate>(`/label-templates/${id}`),
  createTemplate: (body: T.LabelTemplateCreate) =>
    api.post<T.LabelTemplate>("/label-templates", body),
  updateTemplate: (id: Id, body: T.LabelTemplateUpdate) =>
    api.put<T.LabelTemplate>(`/label-templates/${id}`, body),
  deleteTemplate: (id: Id) => api.delete<void>(`/label-templates/${id}`),
  setDefaultTemplate: (id: Id) => api.post<T.LabelTemplate>(`/label-templates/${id}/set-default`),
  render: (body: T.LabelRender) => api.post<T.LabelOut>("/labels", body),
  renderBatch: (panel_ids: Id[], template: string) =>
    api.post<T.LabelBatch>("/labels/batch", { panel_ids, template }),
  get: (id: Id) => api.get<T.LabelOut>(`/labels/${id}`),
  qrImageUrl: (token: string, format: "png" | "svg") => apiUrl(`/qr/${enc(token)}/image.${format}`),
};
