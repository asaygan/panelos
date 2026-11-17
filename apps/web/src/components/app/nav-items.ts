import {
  Activity,
  ClipboardList,
  FileStack,
  LayoutDashboard,
  type LucideIcon,
  PanelsTopLeft,
  Settings,
  Tags,
  TriangleAlert,
  Users,
  Wrench,
} from "lucide-react";
import type { Permission } from "@/data/types";

export interface NavItem {
  /** Key in the `nav` message namespace. */
  key:
    | "dashboard"
    | "panels"
    | "revisions"
    | "schematics"
    | "issues"
    | "maintenance"
    | "labels"
    | "users"
    | "settings";
  href: string;
  icon: LucideIcon;
  /** Hidden unless the member has this permission. */
  perm?: Permission;
  group: "work" | "field" | "admin";
  /** Shown in the phone bottom bar (the rest live under "More"). */
  primary?: boolean;
  /** Which live counter to show as a badge. */
  badge?: "review" | "issues" | "overdue";
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, group: "work", primary: true },
  { key: "panels", href: "/panels", icon: PanelsTopLeft, group: "work", primary: true },
  { key: "revisions", href: "/revisions", icon: ClipboardList, group: "work", badge: "review" },
  { key: "schematics", href: "/schematics", icon: FileStack, group: "work" },
  { key: "issues", href: "/issues", icon: TriangleAlert, group: "field", primary: true, badge: "issues" },
  { key: "maintenance", href: "/maintenance", icon: Wrench, group: "field", primary: true, badge: "overdue" },
  { key: "labels", href: "/labels", icon: Tags, group: "field", perm: "generate_labels" },
  { key: "users", href: "/users", icon: Users, group: "admin", perm: "manage_users" },
  { key: "settings", href: "/settings", icon: Settings, group: "admin", perm: "manage_org" },
];

export const ActivityIcon = Activity;
