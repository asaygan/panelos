"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, NAV_ADMIN } from "./sidebar";
import { Icon } from "@/components/icons/icon";

export function TopNav() {
  const pathname = usePathname();
  const all = [...NAV, ...NAV_ADMIN];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        height: 40,
        padding: "0 10px",
        borderBottom: "1px solid var(--c-line)",
        background: "var(--c-surface)",
        overflowX: "auto",
      }}
    >
      {all.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.id}
            href={item.href as never}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "0 11px",
              height: 28,
              borderRadius: "var(--r-sm)",
              textDecoration: "none",
              background: active ? "var(--c-surface-3)" : "transparent",
              color: active ? "var(--c-ink)" : "var(--c-ink-2)",
              fontWeight: active ? 600 : 500,
              fontSize: "var(--fz)",
            }}
          >
            <Icon
              name={item.icon}
              size={15}
              style={{ color: active ? "var(--c-accent)" : "var(--c-ink-3)" }}
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
