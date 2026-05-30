"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Marks the subtree as the public, no-auth demo. Pure flag — no data fetching. */
const DemoContext = createContext(false);

export function DemoProvider({ children }: { children: ReactNode }) {
  return <DemoContext.Provider value={true}>{children}</DemoContext.Provider>;
}

export function useIsDemo(): boolean {
  return useContext(DemoContext);
}
