"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Brand } from "./brand";
import { CommandPalette } from "./command-palette";
import { NotificationsMenu } from "./notifications-menu";
import { Sidebar, isActivePath, useNavBadges, useVisibleNav } from "./sidebar";
import { UserMenu, type ShellCompany, type ShellUser } from "./user-menu";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/feedback";
import { cn } from "@/lib/utils/cn";

const COLLAPSE_KEY = "panelos:sidebar-collapsed";

/**
 * Application frame.
 *  - desktop (lg+): dark navigation rail + top bar
 *  - phone/tablet: top bar + bottom tab bar (4 primary destinations + "More")
 */
export function AppShell({
  user,
  companies,
  activeCompanyId,
  children,
}: {
  user: ShellUser;
  companies: ShellCompany[];
  activeCompanyId: string | null;
  children: React.ReactNode;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const nav = useVisibleNav();
  const badges = useNavBadges();
  const [collapsed, setCollapsed] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const company = companies.find((c) => c.id === activeCompanyId) ?? companies[0];

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {}
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => setMoreOpen(false), [pathname]);

  const toggleSidebar = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });

  const primary = nav.filter((i) => i.primary);
  const secondary = nav.filter((i) => !i.primary);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:shadow-lg"
      >
        {t("skipToContent")}
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} companyName={company?.name ?? ""} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-topbar shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:px-4">
          <Link href="/dashboard" className="lg:hidden" aria-label="PanelOS">
            <Brand compact />
          </Link>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded border border-border bg-surface-2/70 px-3 text-left text-base text-subtle hover:border-border-strong sm:max-w-md"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{t("searchPlaceholder")}</span>
            <span className="hidden sm:block">
              <Kbd>⌘K</Kbd>
            </span>
          </button>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsMenu />
            <UserMenu user={user} companies={companies} activeCompanyId={activeCompanyId} />
          </div>
        </header>

        <main id="main" className="flex min-h-0 flex-1 flex-col" tabIndex={-1}>
          {children}
        </main>

        {/* Phone / tablet bottom bar */}
        <nav
          aria-label="PanelOS"
          className="safe-bottom grid shrink-0 grid-cols-5 border-t border-border bg-surface lg:hidden"
        >
          {primary.slice(0, 4).map((item) => {
            const active = isActivePath(pathname, item.href);
            const count = item.badge ? badges[item.badge] : 0;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 flex-col items-center justify-center gap-0.5 text-2xs font-medium text-subtle",
                  active && "text-primary",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                <span className="max-w-full truncate px-1">{t(item.key)}</span>
                {count > 0 && (
                  <span className="absolute right-[calc(50%-18px)] top-1.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-0.5 text-2xs font-medium text-subtle",
              secondary.some((i) => isActivePath(pathname, i.href)) && "text-primary",
            )}
          >
            <Menu className="size-5" aria-hidden />
            {t("more")}
          </button>
        </nav>
      </div>

      <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent title={company?.name ?? "PanelOS"} widthClass="max-w-xs">
          <ul className="-mx-2 flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded px-3 text-lg hover:bg-surface-2",
                      active && "bg-surface-2 font-medium",
                    )}
                  >
                    <item.icon className={cn("size-5 text-subtle", active && "text-primary")} aria-hidden />
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Dialog>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
