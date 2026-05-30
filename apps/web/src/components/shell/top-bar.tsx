"use client";

import { Icon } from "@/components/icons/icon";
import { Btn } from "@/components/primitives/button";
import { Avatar } from "@/components/primitives/avatar";
import { Badge } from "@/components/primitives/badge";
import { Menu } from "@/components/primitives/menu";
import type { User } from "@/lib/api/types";
import { useTweaks } from "@/hooks/use-tweaks";
import { logoutAction } from "@/lib/auth/server-actions";

export interface Crumb {
  label: string;
  href?: string;
}

export interface TopBarProps {
  title?: string;
  sub?: string;
  crumbs?: Crumb[];
  user: Pick<User, "name" | "initials" | "color">;
  onOpenSearch: () => void;
  /** Optional path prefix (e.g. "/demo"). Default "" = production behavior. */
  basePath?: string;
  /** When true, shows a "DEMO MODE" badge and disables the real sign-out action. */
  demoMode?: boolean;
}

export function TopBar({ title, sub, crumbs, user, onOpenSearch, basePath = "", demoMode = false }: TopBarProps) {
  const [tweaks, setTweak] = useTweaks();
  void basePath;

  return (
    <header
      style={{
        height: "var(--topbar-h)",
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 14px",
        borderBottom: "1px solid var(--c-line)",
        background: "var(--c-surface)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        {crumbs ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "var(--fz-sm)",
              color: "var(--c-ink-3)",
            }}
          >
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <Icon name="chevron-right" size={12} />}
                <span
                  style={{
                    color: i === crumbs.length - 1 ? "var(--c-ink)" : "var(--c-ink-3)",
                    fontWeight: i === crumbs.length - 1 ? 640 : 500,
                  }}
                >
                  {c.label}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            {title && (
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 680,
                  letterSpacing: "-.01em",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </span>
            )}
            {demoMode && (
              <span style={{ alignSelf: "center" }}>
                <Badge tone="warn" dot>
                  DEMO MODE
                </Badge>
              </span>
            )}
            {sub && <span style={{ fontSize: "var(--fz-sm)", color: "var(--c-ink-3)" }}>{sub}</span>}
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          maxWidth: 460,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <button
          type="button"
          onClick={onOpenSearch}
          style={{
            width: "100%",
            maxWidth: 360,
            height: 30,
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "0 9px",
            border: "1px solid var(--c-line-strong)",
            borderRadius: "var(--r-sm)",
            color: "var(--c-ink-4)",
            cursor: "text",
            background: "var(--c-canvas)",
          }}
        >
          <Icon name="search" size={14} />
          <span style={{ flex: 1, fontSize: "var(--fz-sm)", textAlign: "left" }}>
            Search panels, serials, components…
          </span>
          <kbd>⌘K</kbd>
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Btn
          icon={tweaks.theme === "dark" ? "sun" : "moon"}
          variant="ghost"
          size="sm"
          title="Toggle theme"
          onClick={() => setTweak("theme", tweaks.theme === "dark" ? "light" : "dark")}
        />
        <Menu
          align="end"
          width={260}
          trigger={
            <span style={{ position: "relative", display: "inline-flex" }}>
              <Btn icon="bell" variant="ghost" size="sm" />
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 5,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--c-fault)",
                  border: "1.5px solid var(--c-surface)",
                }}
              />
            </span>
          }
          items={[
            { label: "PCC-1 reported a fault", icon: "alert-triangle" },
            { label: "Rev F draft awaiting review", icon: "git-branch" },
            { label: "SUB-B coordination study due", icon: "clock" },
            { sep: true },
            { label: "View all activity", icon: "activity" },
          ]}
        />
        <Menu
          align="end"
          width={200}
          trigger={
            <span style={{ display: "inline-flex", cursor: "pointer" }}>
              <Avatar user={user} size={28} />
            </span>
          }
          items={[
            { label: user.name, icon: "shield" },
            { sep: true },
            { label: "Account settings", icon: "settings" },
            { label: "Manage users", icon: "users" },
            { sep: true },
            {
              label: "Sign out",
              icon: "logout",
              danger: true,
              onClick: () => {
                if (demoMode) return;
                void logoutAction();
              },
            },
          ]}
        />
      </div>
    </header>
  );
}
