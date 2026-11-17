"use client";

import * as React from "react";

const STORAGE_KEY = "panelos.panels.tree.expanded.v1";

function read(): string[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : null;
  } catch {
    return null;
  }
}

/**
 * Expanded-node set remembered in localStorage. On the very first visit
 * (nothing stored) every project starts expanded.
 */
export function useExpanded(projectKeys: string[], ready: boolean) {
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(() => new Set());
  const stored = React.useRef<"unknown" | "none" | "some">("unknown");

  React.useEffect(() => {
    const saved = read();
    stored.current = saved ? "some" : "none";
    if (saved) setExpanded(new Set(saved));
  }, []);

  React.useEffect(() => {
    if (!ready || stored.current !== "none") return;
    stored.current = "some";
    setExpanded(new Set(projectKeys));
  }, [ready, projectKeys]);

  const update = React.useCallback((next: ReadonlySet<string>) => {
    setExpanded(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
    } catch {
      /* storage unavailable: expansion simply isn't remembered */
    }
  }, []);

  const toggle = React.useCallback(
    (key: string, force?: boolean) =>
      setExpanded((prev) => {
        const open = force ?? !prev.has(key);
        if (open === prev.has(key)) return prev;
        const next = new Set(prev);
        if (open) next.add(key);
        else next.delete(key);
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      }),
    [],
  );

  const open = React.useCallback(
    (keys: string[]) =>
      setExpanded((prev) => {
        if (keys.every((k) => prev.has(k))) return prev;
        const next = new Set(prev);
        keys.forEach((k) => next.add(k));
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      }),
    [],
  );

  return { expanded, toggle, open, replace: update };
}
