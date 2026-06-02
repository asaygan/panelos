import { api } from "./client";
import type { components } from "@panelos/types/generated";

// ── Generated DTO aliases (snake_case, exactly what the API returns) ──────────
type Schemas = components["schemas"];
export type PanelDTO = Schemas["PanelOut"];
export type RevisionDTO = Schemas["RevisionOut"];
export type ComponentDTO = Schemas["ComponentOut"];
export type MeDTO = Schemas["MeOut"];
export type MemberDTO = Schemas["MemberOut"];
export type LocationDTO = Schemas["LocationOut"];
export type CompanyDTO = Schemas["CompanyOut"];
export type LabelDTO = Schemas["LabelOut"];
export type LabelTemplateDTO = Schemas["LabelTemplateOut"];
export type SheetDTO = Schemas["SheetOut"];
export type FileDTO = Schemas["FileOut"];
export type PresignResponseDTO = Schemas["PresignResponse"];
export type BatchRenderOutDTO = Schemas["BatchRenderOut"];
export type InvitationOutDTO = Schemas["InvitationOut"];
export type QrResolveDTO = Schemas["QrResolveOut"];
export type RoleDTO = Schemas["RoleOut"];
export type AuditLogDTO = Schemas["AuditLogOut"];
export type RoleEnum = Schemas["Role"];
export type InvitationInfoDTO = Schemas["InvitationInfoOut"];
export type TokenOutDTO = Schemas["TokenOut"];
export type PanelSetDTO = Schemas["PanelSetOut"];
export type SectionDTO = Schemas["SectionOut"];
export type TreeDTO = Schemas["TreeOut"];

export interface SearchHitDTO {
  type: string;
  id: string;
  tag?: string;
  name?: string;
  serial?: string;
  [k: string]: string | undefined;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (payload: { email: string; password: string }) =>
    api.post<LoginResponse>("/auth/login", payload),
  logout: () => api.post<void>("/auth/logout"),
  me: () => api.get<MeDTO>("/auth/me"),
  refresh: () => api.post<LoginResponse>("/auth/refresh"),
  /** Public: resolve an invitation token for the accept page. */
  getInvitation: (token: string) =>
    api.get<InvitationInfoDTO>(`/auth/invitations/${encodeURIComponent(token)}`),
  /** Public: set password + activate membership; returns login tokens (auto-login). */
  acceptInvite: (body: Schemas["AcceptInviteIn"]) =>
    api.post<TokenOutDTO>("/auth/accept-invite", body),
};

// ── Panels ──────────────────────────────────────────────────────────────────
export interface PanelListParams {
  q?: string;
  location_id?: string;
  status?: string;
  cursor?: string;
  limit?: number;
  [k: string]: string | number | undefined;
}

export const panels = {
  list: async (params?: PanelListParams): Promise<PanelDTO[]> => {
    const res = await api.get<{ items: PanelDTO[]; next_cursor?: string | null }>("/panels", {
      query: params,
    });
    return res.items;
  },
  get: (id: string) => api.get<PanelDTO>(`/panels/${id}`),
  create: (body: Schemas["PanelCreateIn"]) => api.post<PanelDTO>("/panels", body),
  update: (id: string, body: Schemas["PanelUpdateIn"]) =>
    api.put<PanelDTO>(`/panels/${id}`, body),
  archive: (id: string) => api.delete<void>(`/panels/${id}`),
  activity: (id: string) =>
    api.get<{ scans?: Record<string, string>[] }>(`/panels/${id}/activity`),
  revisions: (id: string) => api.get<RevisionDTO[]>(`/panels/${id}/revisions`),
  sheets: (id: string, revisionId?: string) =>
    api.get<SheetDTO[]>(`/panels/${id}/sheets`, {
      query: revisionId ? { revision_id: revisionId } : undefined,
    }),
  components: (id: string) => api.get<ComponentDTO[]>(`/panels/${id}/components`),
};

// ── Panel Sets + Sections ─────────────────────────────────────────────────────
export const panelSets = {
  list: async (): Promise<PanelSetDTO[]> => {
    const res = await api.get<{ items: PanelSetDTO[]; next_cursor?: string | null }>(
      "/panel-sets",
      { query: { limit: 200 } },
    );
    return res.items;
  },
  tree: () => api.get<TreeDTO>("/panel-sets/tree"),
  get: (id: string) => api.get<PanelSetDTO>(`/panel-sets/${id}`),
  create: (body: Schemas["PanelSetCreateIn"]) => api.post<PanelSetDTO>("/panel-sets", body),
  update: (id: string, body: Schemas["PanelSetUpdateIn"]) =>
    api.put<PanelSetDTO>(`/panel-sets/${id}`, body),
  archive: (id: string) => api.delete<void>(`/panel-sets/${id}`),
};

export const sections = {
  list: (panelId: string) => api.get<SectionDTO[]>(`/panels/${panelId}/sections`),
  create: (panelId: string, body: Schemas["SectionCreateIn"]) =>
    api.post<SectionDTO>(`/panels/${panelId}/sections`, body),
  update: (id: string, body: Schemas["SectionUpdateIn"]) =>
    api.put<SectionDTO>(`/sections/${id}`, body),
  remove: (id: string) => api.delete<void>(`/sections/${id}`),
  move: (id: string, body: Schemas["SectionMoveIn"]) =>
    api.post<SectionDTO>(`/sections/${id}/move`, body),
};

// ── Revisions ─────────────────────────────────────────────────────────────────
export const revisions = {
  queue: (filter?: "draft" | "review" | "all") =>
    api.get<RevisionDTO[]>("/revisions", { query: { filter } }),
  get: (id: string) => api.get<RevisionDTO>(`/revisions/${id}`),
  create: (panelId: string, change_summary: string) =>
    api.post<RevisionDTO>(`/panels/${panelId}/revisions`, { change_summary }),
  submit: (id: string) => api.post<RevisionDTO>(`/revisions/${id}/submit`),
  approve: (id: string, note?: string) =>
    api.post<RevisionDTO>(`/revisions/${id}/approve`, { note }),
  reject: (id: string, note?: string) =>
    api.post<RevisionDTO>(`/revisions/${id}/reject`, { note }),
  components: (revisionId: string) =>
    api.get<ComponentDTO[]>(`/revisions/${revisionId}/components`),
};

// ── Components ────────────────────────────────────────────────────────────────
export const componentsApi = {
  add: (revisionId: string, body: Schemas["ComponentCreateIn"]) =>
    api.post<ComponentDTO>(`/revisions/${revisionId}/components`, body),
  update: (id: string, body: Schemas["ComponentUpdateIn"]) =>
    api.put<ComponentDTO>(`/components/${id}`, body),
  remove: (id: string) => api.delete<void>(`/components/${id}`),
  import: (revisionId: string, file: File): Promise<ComponentDTO[]> => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ComponentDTO[]>(`/revisions/${revisionId}/components/import`, undefined, {
      rawBody: fd,
    });
  },
};

// ── Files ─────────────────────────────────────────────────────────────────────
export const files = {
  presign: (filename: string, content_type = "application/pdf") =>
    api.post<PresignResponseDTO>("/files/presign", { filename, content_type }),
  finalize: (body: { key: string; sha256?: string; byte_size?: number; original_filename?: string }) =>
    api.post<FileDTO>("/files/finalize", body),
  attachSheet: (panelId: string, revisionId: string, body: Schemas["AttachSheetIn"]) =>
    api.post<SheetDTO>(`/files/panels/${panelId}/revisions/${revisionId}/sheets`, body),
  get: (id: string) => api.get<{ url: string }>(`/files/${id}`),
  serveUrl: (key: string) => `/api/v1/files/serve/${key}`,
  updateSheet: (sheetId: string, body: { sheet_number?: string; sheet_title?: string }) =>
    api.patch<SheetDTO>(`/files/sheets/${sheetId}`, body),
  deleteSheet: (sheetId: string) => api.delete<void>(`/files/sheets/${sheetId}`),
};

// ── Labels ──────────────────────────────────────────────────────────────────
export const labels = {
  render: (payload: Schemas["LabelRenderIn"]) => api.post<LabelDTO>("/labels", payload),
  batch: (panel_ids: string[], template?: string) =>
    api.post<BatchRenderOutDTO>("/labels/batch", { panel_ids, template }),
  get: (id: string) => api.get<LabelDTO>(`/labels/${id}`),
};

// ── Label templates ─────────────────────────────────────────────────────────
export const labelTemplates = {
  list: () => api.get<LabelTemplateDTO[]>("/label-templates"),
  get: (id: string) => api.get<LabelTemplateDTO>(`/label-templates/${id}`),
  create: (body: Schemas["LabelTemplateCreateIn"]) =>
    api.post<LabelTemplateDTO>("/label-templates", body),
  update: (id: string, body: Schemas["LabelTemplateUpdateIn"]) =>
    api.put<LabelTemplateDTO>(`/label-templates/${id}`, body),
  remove: (id: string) => api.delete<void>(`/label-templates/${id}`),
  setDefault: (id: string) =>
    api.post<LabelTemplateDTO>(`/label-templates/${id}/set-default`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export interface UserListParams {
  search?: string;
  role?: string;
  status?: string;
  location_id?: string;
  [k: string]: string | undefined;
}

export interface AuditLogParams {
  target_type?: string;
  limit?: number;
  [k: string]: string | number | undefined;
}

export const users = {
  list: (params?: UserListParams) => api.get<MemberDTO[]>("/users", { query: params }),
  invite: (
    body: { email: string; role: RoleEnum; location_ids?: string[]; message?: string },
  ) => api.post<InvitationOutDTO>("/users/invitations", body),
  changeRole: (membershipId: string, body: { role: RoleEnum }) =>
    api.patch<{ id: string; role: RoleEnum }>(`/users/${membershipId}/role`, body),
  changeStatus: (membershipId: string, body: { status: "active" | "suspended" }) =>
    api.patch<{ id: string; status: string }>(`/users/${membershipId}/status`, body),
  remove: (membershipId: string) => api.delete<void>(`/users/${membershipId}`),
  resendInvite: (membershipId: string) =>
    api.post<{ id: string; email: string; role: RoleEnum; token: string }>(
      `/users/${membershipId}/resend-invitation`,
    ),
  assignLocations: (membershipId: string, body: { location_ids: string[] }) =>
    api.put<{ location_ids: string[] }>(`/users/${membershipId}/locations`, body),
  roles: () => api.get<RoleDTO[]>("/roles"),
  auditLogs: (params?: AuditLogParams) => api.get<AuditLogDTO[]>("/audit-logs", { query: params }),
};

// ── Locations / company ──────────────────────────────────────────────────────
export const locations = {
  list: () => api.get<LocationDTO[]>("/companies/me/locations"),
  create: (body: Schemas["LocationCreateIn"]) =>
    api.post<LocationDTO>("/companies/me/locations", body),
  update: (id: string, body: Schemas["LocationUpdateIn"]) =>
    api.put<LocationDTO>(`/companies/me/locations/${id}`, body),
  remove: (id: string) => api.delete<void>(`/companies/me/locations/${id}`),
};

export const company = {
  get: () => api.get<CompanyDTO>("/companies/me"),
  update: (body: Schemas["CompanyUpdateIn"]) => api.put<CompanyDTO>("/companies/me", body),
};

// ── Search / QR ─────────────────────────────────────────────────────────────
export const search = async (q: string): Promise<SearchHitDTO[]> => {
  const res = await api.get<{ items: SearchHitDTO[] }>("/search", { query: { q } });
  return res.items;
};

export const qr = {
  resolve: (token: string) => api.get<QrResolveDTO>(`/qr/${token}`),
};
