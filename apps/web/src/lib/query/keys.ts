export const queryKeys = {
  panels: {
    all: () => ["panels"] as const,
    list: (params?: Record<string, unknown>) => ["panels", "list", params ?? {}] as const,
    detail: (id: string) => ["panels", "detail", id] as const,
    revisions: (id: string) => ["panels", id, "revisions"] as const,
    sheets: (id: string) => ["panels", id, "sheets"] as const,
    components: (id: string) => ["panels", id, "components"] as const,
    activity: (id: string) => ["panels", id, "activity"] as const,
  },
  projects: {
    all: () => ["projects"] as const,
    list: () => ["projects", "list"] as const,
    tree: () => ["projects", "tree"] as const,
    detail: (id: string) => ["projects", "detail", id] as const,
    statusHistory: (id: string) => ["projects", id, "status-history"] as const,
  },
  systemGroups: {
    detail: (id: string) => ["system-groups", "detail", id] as const,
    statusHistory: (id: string) => ["system-groups", id, "status-history"] as const,
  },
  cabinets: {
    forPanel: (panelId: string) => ["panels", panelId, "cabinets"] as const,
  },
  revisions: {
    queue: (filter?: string) => ["revisions", "queue", filter ?? "all"] as const,
  },
  users: {
    all: () => ["users"] as const,
    list: (filters?: Record<string, unknown>) => ["users", "list", filters ?? {}] as const,
  },
  roles: {
    all: () => ["roles"] as const,
  },
  auditLogs: {
    all: (params?: Record<string, unknown>) => ["audit-logs", params ?? {}] as const,
  },
  locations: {
    all: () => ["locations"] as const,
  },
  company: {
    me: () => ["company", "me"] as const,
  },
  labelTemplates: {
    all: () => ["label-templates"] as const,
  },
  search: (q: string) => ["search", q] as const,
};
