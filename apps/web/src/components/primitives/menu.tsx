"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons/icon";

export interface MenuItem {
  label: string;
  icon?: IconName;
  kbd?: string;
  onClick?: () => void;
  danger?: boolean;
  sep?: false;
}
export interface MenuSeparator {
  sep: true;
}

export type MenuEntry = MenuItem | MenuSeparator;

export interface MenuProps {
  trigger: ReactNode;
  items: MenuEntry[];
  align?: "start" | "end" | "center";
  width?: number;
}

export function Menu({ trigger, items, align = "end", width = 180 }: MenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <span style={{ display: "inline-flex", cursor: "pointer" }}>{trigger}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          style={{
            minWidth: width,
            background: "var(--c-surface)",
            border: "1px solid var(--c-line-strong)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--shadow-pop)",
            padding: 4,
            zIndex: 250,
            animation: "ph-pop .12s ease",
          }}
        >
          {items.map((it, i) =>
            "sep" in it && it.sep ? (
              <DropdownMenu.Separator
                key={`sep-${i}`}
                style={{ height: 1, background: "var(--c-line)", margin: "4px 0" }}
              />
            ) : (
              <DropdownMenu.Item
                key={i}
                onSelect={() => (it as MenuItem).onClick?.()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  fontSize: "var(--fz)",
                  outline: "none",
                  color: (it as MenuItem).danger ? "var(--c-fault)" : "var(--c-ink-2)",
                }}
                className="menu-item"
              >
                {(it as MenuItem).icon && <Icon name={(it as MenuItem).icon!} size={14} />}
                <span style={{ flex: 1 }}>{(it as MenuItem).label}</span>
                {(it as MenuItem).kbd && <kbd>{(it as MenuItem).kbd}</kbd>}
              </DropdownMenu.Item>
            ),
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
