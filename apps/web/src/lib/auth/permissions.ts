import type { Membership, Role } from "@/lib/api/types";

export enum Permission {
  ManageOrg = "manage_org",
  ManageUsers = "manage_users",
  CrudPanels = "crud_panels",
  CreateRevision = "create_revision",
  ApproveRevision = "approve_revision",
  UploadPdf = "upload_pdf",
  GenerateLabels = "generate_labels",
  ScanQr = "scan_qr",
  ReportIssue = "report_issue",
}

const MATRIX: Record<Role, Permission[]> = {
  owner: Object.values(Permission),
  admin: [
    Permission.ManageUsers,
    Permission.CrudPanels,
    Permission.CreateRevision,
    Permission.ApproveRevision,
    Permission.UploadPdf,
    Permission.GenerateLabels,
    Permission.ScanQr,
    Permission.ReportIssue,
  ],
  engineer: [
    Permission.CrudPanels,
    Permission.CreateRevision,
    Permission.ApproveRevision,
    Permission.UploadPdf,
    Permission.GenerateLabels,
    Permission.ScanQr,
    Permission.ReportIssue,
  ],
  technician: [Permission.ScanQr, Permission.ReportIssue],
  viewer: [Permission.ScanQr],
};

export function can(membership: Membership | null | undefined, perm: Permission): boolean {
  if (!membership) return false;
  return MATRIX[membership.role]?.includes(perm) ?? false;
}
