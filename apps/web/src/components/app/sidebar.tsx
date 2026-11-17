"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Brand } from "./brand";
import { NAV_ITEMS, type NavItem } from "./nav-items";
import { Tooltip } from "@/components/ui/menu";
import { useDashboard, usePermissions } from "@/data/hooks";
import { cn } from "@/lib/utils/cn";

const GROUPS: { id: NavItem["group"]; label: "groupWork" | "groupField" | "groupAdmin" }[] = [
  { id: "work", label: "groupWork" },
  { id: "field", label: "groupField" },
  { id: "admin", label: "groupAdmin" },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Live counters shown next to nav items (same numbers as the dashboard). */
export function useNavBadges(): Record<NonNullable<NavItem["badge"]>, number> {
  const { data } = useDashboard();
  return {
    review: data?.revisions.review ?? 0,
    issues: data?.issues.open ?? 0,
    overdue: data?.maintenance.overdue ?? 0,
  };
}

export function useVisibleNav(): NavItem[] {
  const { can, ready } = usePermissions();
  return NAV_ITEMS.filter((item) => !item.perm || (ready && can(item.perm)));
}

export function Sidebar({
  collapsed,
  onToggle,
  companyName,
}: {
  collapsed: boolean;
  onToggle: () => void;
  companyName: string;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = useVisibleNav();
  const badges = useNavBadges();

  return (
    <aside
      className={cn(
        "hidden h-dvh shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-150 lg:flex",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div className={cn("flex h-topbar items-center", collapsed ? "justify-center" : "px-4")}>
        <Link href="/dashboard" aria-label="PanelOS">
          <Brand compact={collapsed} />
        </Link>
      </div>

      <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-2" aria-label="PanelOS">
        {GROUPS.map((group) => {
          const groupItems = items.filter((i) => i.group === group.id);
          if (groupItems.length === 0) return null;
          return (
            <div key={group.id} className="mb-4">
              {!collapsed && (
                <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-sidebar-muted">
                  {t(group.label)}
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {groupItems.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const count = item.badge ? badges[item.badge] : 0;
                  const link = (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex h-9 items-center gap-2.5 rounded px-2 text-base text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground",
                        active && "bg-sidebar-active font-medium text-sidebar-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" aria-hidden />
                      )}
                      <item.icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden />
                      {!collapsed && <span className="flex-1 truncate">{t(item.key)}</span>}
                      {count > 0 &&
                        (collapsed ? (
                          <span className="absolute right-2 top-1.5 size-1.5 rounded-full bg-primary" aria-hidden />
                        ) : (
                          <span className="rounded-full bg-primary/20 px-1.5 text-2xs font-semibold text-primary">
                            {count}
                          </span>
                        ))}
                    </Link>
                  );
                  return (
                    <li key={item.key}>
                      {collapsed ? (
                        <Tooltip label={t(item.key)} side="right">
                          {link}
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <div className="truncate px-2 pb-2 text-xs text-sidebar-muted" title={companyName}>
            {companyName}
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? t("expand") : t("collapse")}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded px-2 text-sm text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && t("collapse")}
        </button>
      </div>
    </aside>
  );
}
