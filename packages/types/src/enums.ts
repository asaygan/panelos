// Hand-written domain enums — must stay in sync with the backend Python enums
// in apps/api. String-literal unions so they collapse at runtime.

export type Role =
  | 'owner'
  | 'admin'
  | 'engineer'
  | 'operator'
  | 'viewer';

export const ROLES = ['owner', 'admin', 'engineer', 'operator', 'viewer'] as const satisfies readonly Role[];

export type Permission =
  | 'panel.read'
  | 'panel.write'
  | 'panel.delete'
  | 'revision.read'
  | 'revision.write'
  | 'revision.publish'
  | 'file.read'
  | 'file.write'
  | 'user.read'
  | 'user.write'
  | 'org.admin';

export type RevisionStatus = 'draft' | 'in_review' | 'published' | 'archived';
export const REVISION_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const satisfies readonly RevisionStatus[];

export type PanelStatus = 'active' | 'idle' | 'fault' | 'warn' | 'offline';
export const PANEL_STATUSES = ['active', 'idle', 'fault', 'warn', 'offline'] as const satisfies readonly PanelStatus[];

export type FileMime =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/svg+xml'
  | 'application/dxf'
  | 'application/step'
  | 'application/zip'
  | 'text/plain'
  | 'application/octet-stream';
