"use client";

import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

export interface TabItem {
  value: string;
  label: ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

/** Minimal accessible tabs built on Radix. Panels are rendered as children. */
export function Tabs({ tabs, value, onValueChange, children }: TabsProps) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange}>
      <RadixTabs.List
        style={{
          display: "flex",
          gap: 2,
          padding: "0 4px",
          borderBottom: "1px solid var(--c-line)",
        }}
      >
        {tabs.map((t) => (
          <RadixTabs.Trigger key={t.value} value={t.value} className="tab-trigger">
            {t.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export function TabPanel({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RadixTabs.Content value={value} style={{ outline: "none" }}>
      {children}
    </RadixTabs.Content>
  );
}
