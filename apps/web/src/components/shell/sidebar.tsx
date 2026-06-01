"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/icons/logo";
import { Icon, type IconName } from "@/components/icons/icon";
import { Btn } from "@/components/primitives/button";
import { Menu, type MenuEntry } from "@/components/primitives/menu";
import { useQueryClient } from "@tanstack/react-query";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  engineer: "Engineer",
  technician: "Technician",
  viewer: "Viewer",
};

/** Sets the active-company cookie (read by the API client to attach X-Company-Id). */
function setActiveCompanyCookie(id: string) {
  const secure = typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `panelos_company=${encodeURIComponent(id)}; path=/; max-age=${
    60 * 60 * 24 * 7
  }; samesite=lax${secure ? "; secure" : ""}`;
}

/** Two-letter monogram from an organization name. */
function orgInitials(name: string): string {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  badge?: number;
}

export const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "layout-grid", href: "/dashboard" },
  { id: "panels", label: "Panels", icon: "server", href: "/panels" },
  { id: "revisions", label: "Revisions", icon: "git-branch", href: "/revisions" },
  { id: "schematics", label: "Schematics", icon: "file-text", href: "/schematics" },
  { id: "labels", label: "QR Labels", icon: "qr-code", href: "/labels" },
];

export const NAV_ADMIN: NavItem[] = [
  { id: "users", label: "Users", icon: "users", href: "/users" },
  { id: "settings", label: "Settings", icon: "settings", href: "/settings" },
];

export interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  counts: { panels: number; rev: number };
  company: string;
  /** The signed-in user's memberships. When >1, the org block becomes a switcher. */
  companies?: { id: string; role: string }[];
  /** The currently active company id (matches the `panelos_company` cookie). */
  activeCompanyId?: string;
  /** Optional path prefix for nav links (e.g. "/demo"). Default "" = production behavior. */
  basePath?: string;
}

export function Sidebar({
  collapsed,
  onCollapse,
  counts,
  company,
  companies = [],
  activeCompanyId = "",
  basePath = "",
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const canSwitch = companies.length > 1;

  const switchCompany = (id: string) => {
    if (!id || id === activeCompanyId) return;
    setActiveCompanyCookie(id);
    // Drop all cached reads so they refetch under the new company scope, then
    // refresh server components (layout reads the active company server-side).
    queryClient.clear();
    router.refresh();
  };
  const href = (item: NavItem) => `${basePath}${item.href}`;
  const isActive = (item: NavItem) =>
    pathname === href(item) || pathname.startsWith(`${href(item)}/`);

  return (
    <aside
      style={{
        width: collapsed ? 52 : "var(--sidebar-w)",
        flex: "none",
        borderRight: "1px solid var(--c-line)",
        background: "var(--c-surface)",
        display: "flex",
        flexDirection: "column",
        transition: "width .16s ease",
      }}
    >
      <div
        style={{
          height: "var(--topbar-h)",
          display: "flex",
          alignItems: "center",
          padding: collapsed ? 0 : "0 12px",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid var(--c-line)",
        }}
      >
        <Logo withWord={!collapsed} />
        {!collapsed && <Btn icon="panel-left" variant="ghost" size="sm" onClick={() => onCollapse(true)} />}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: collapsed ? "8px 8px" : "10px 10px" }}>
        {!collapsed && <div className="label-cap" style={{ padding: "4px 9px 6px" }}>Operations</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              href={href(item)}
              active={isActive(item)}
              collapsed={collapsed}
              badge={item.id === "panels" ? counts.panels : item.id === "revisions" ? counts.rev : undefined}
            />
          ))}
        </div>
        <div style={{ height: 14 }} />
        {!collapsed && <div className="label-cap" style={{ padding: "4px 9px 6px" }}>Administration</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ADMIN.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              href={href(item)}
              active={isActive(item)}
              collapsed={collapsed}
            />
          ))}
        </div>
      </div>

      {collapsed && (
        <div style={{ padding: 8, borderTop: "1px solid var(--c-line)" }}>
          <Btn icon="chevron-right" variant="ghost" size="sm" onClick={() => onCollapse(false)} />
        </div>
      )}

      {!collapsed && (
        <div style={{ borderTop: "1px solid var(--c-line)", padding: 8 }}>
          {canSwitch ? (
            <Menu
              align="start"
              width={220}
              trigger={<OrgBlock company={company} counts={counts} interactive />}
              items={buildCompanyMenu(companies, activeCompanyId, switchCompany)}
            />
          ) : (
            <OrgBlock company={company} counts={counts} />
          )}
        </div>
      )}
    </aside>
  );
}

/** The org identity block — clickable trigger when used inside the switcher Menu. */
function OrgBlock({
  company,
  counts,
  interactive = false,
}: {
  company: string;
  counts: { panels: number; rev: number };
  interactive?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 7px",
        borderRadius: "var(--r-sm)",
        border: "1px solid var(--c-line)",
        width: "100%",
        cursor: interactive ? "pointer" : "default",
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          background: "var(--c-ink)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 11,
          fontWeight: 800,
          flex: "none",
        }}
      >
        {orgInitials(company)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 640,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {company}
        </div>
        <div style={{ fontSize: 10, color: "var(--c-ink-3)" }}>
          {counts.panels} {counts.panels === 1 ? "panel" : "panels"}
        </div>
      </div>
      {interactive && (
        <Icon name="chevrons-up-down" size={13} style={{ color: "var(--c-ink-3)", flex: "none" }} />
      )}
    </div>
  );
}

/**
 * Build the org-switcher menu. /auth/me returns only ids + roles (no names), so the
 * active org shows its resolved name and the others list by short id + role chip.
 */
function buildCompanyMenu(
  companies: { id: string; role: string }[],
  activeId: string,
  onSwitch: (id: string) => void,
): MenuEntry[] {
  return companies.map((c): MenuEntry => {
    const isActive = c.id === activeId;
    const role = ROLE_LABELS[c.role.toLowerCase()] ?? c.role;
    const shortId = c.id.length > 8 ? `${c.id.slice(0, 8)}…` : c.id;
    return {
      label: isActive ? `Current org · ${role}` : `${shortId} · ${role}`,
      icon: isActive ? "check" : "building",
      onClick: () => onSwitch(c.id),
    };
  });
}

function SidebarItem({
  item,
  href,
  active,
  collapsed,
  badge,
}: {
  item: NavItem;
  href: string;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href as never}
      title={collapsed ? item.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        height: 31,
        padding: collapsed ? 0 : "0 9px",
        justifyContent: collapsed ? "center" : "flex-start",
        borderRadius: "var(--r-sm)",
        position: "relative",
        textDecoration: "none",
        color: active ? "var(--c-ink)" : "var(--c-ink-2)",
        background: active ? "var(--c-surface-3)" : "transparent",
        fontWeight: active ? 600 : 500,
        fontSize: "var(--fz)",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: -8,
            top: 7,
            bottom: 7,
            width: 3,
            background: "var(--c-accent)",
            borderRadius: 3,
          }}
        />
      )}
      <Icon
        name={item.icon}
        size={16}
        style={{ color: active ? "var(--c-accent)" : "var(--c-ink-3)" }}
      />
      {!collapsed && <span style={{ flex: 1 }}>{item.label}</span>}
      {!collapsed && badge != null && (
        <span
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--c-ink-3)",
            background: "var(--c-surface-3)",
            padding: "1px 5px",
            borderRadius: 4,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
