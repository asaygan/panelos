/**
 * API types, straight from the generated OpenAPI schema (snake_case, exactly
 * what the server returns). UI code uses these directly: there is no
 * hand-written "view model" layer to drift out of sync.
 */
import type { components } from "@panelos/types/generated";

type S = components["schemas"];

export type Me = S["MeOut"];
export type Company = S["CompanyOut"];
export type CompanyUpdate = S["CompanyUpdateIn"];
export type Location = S["LocationOut"];
export type Member = S["MemberOut"];
export type RoleInfo = S["RoleOut"];
export type Role = S["Role"];
export type AuditLog = S["AuditLogOut"];

export type Panel = S["PanelOut"];
export type PanelCreate = S["PanelCreateIn"];
export type PanelUpdate = S["PanelUpdateIn"];
export type Project = S["ProjectOut"];
export type ProjectCreate = S["ProjectCreateIn"];
export type ProjectUpdate = S["ProjectUpdateIn"];
export type SystemGroup = S["SystemGroupOut"];
export type SystemGroupCreate = S["SystemGroupCreateIn"];
export type SystemGroupUpdate = S["SystemGroupUpdateIn"];
export type Cabinet = S["CabinetOut"];
export type Tree = S["TreeOut"];
export type ProjectNode = S["ProjectNode"];
export type GroupNode = S["SystemGroupNode"];
export type PanelNode = S["PanelNode"];
export type LifecycleStatus = S["LifecycleStatus"];
export type GroupType = S["GroupType"];

export type Revision = S["RevisionOut"];
export type RevisionStatus = S["RevisionStatus"];
export type Sheet = S["SheetOut"];
export type StoredFile = S["FileOut"];
export type BomItem = S["ComponentOut"];
export type BomItemCreate = S["ComponentCreateIn"];

export type Issue = S["IssueOut"];
export type IssueDetail = S["IssueDetailOut"];
export type IssueCreate = S["IssueCreateIn"];
export type IssueUpdate = S["IssueUpdateIn"];
export type Maintenance = S["MaintenanceOut"];
export type MaintenanceCreate = S["MaintenanceCreateIn"];
export type MaintenancePlan = S["PlanOut"];
export type PlanCreate = S["PlanCreateIn"];
export type PlanUpdate = S["PlanUpdateIn"];
export type Attachment = S["AttachmentOut"];

export type Dashboard = S["DashboardOut"];
export type NotificationItem = S["NotificationOut"];
export type NotificationList = S["NotificationListOut"];
export type ImportResult = S["ImportResultOut"];
export type LabelTemplate = S["LabelTemplateOut"];
export type LabelTemplateCreate = S["LabelTemplateCreateIn"];
export type LabelTemplateUpdate = S["LabelTemplateUpdateIn"];
export type LabelRender = S["LabelRenderIn"];
export type LabelOut = S["LabelOut"];
export type LabelBatch = S["BatchRenderOut"];
export type ProjectHistory = S["ProjectStatusHistoryOut"];
export type GroupHistory = S["SystemGroupStatusHistoryOut"];
export type QrResolve = S["QrResolveOut"];

export type Severity = Issue["severity"];
export type IssueState = Issue["status"];
export type DocStatus = Panel["doc_status"];

/** Mixed search hit (see GET /search). */
export interface SearchHit {
  type: "panel" | "project" | "system_group" | "cabinet" | "component" | "issue";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

export interface ScanEvent {
  id: string;
  at: string;
  device: string;
}

/** Permission keys enforced by the API (GET /auth/me → permissions). */
export type Permission =
  | "manage_org"
  | "manage_users"
  | "view_audit"
  | "crud_panels"
  | "create_revision"
  | "approve_revision"
  | "upload_pdf"
  | "generate_labels"
  | "manage_maintenance"
  | "manage_issues"
  | "report_issue"
  | "export_data"
  | "scan_qr";
