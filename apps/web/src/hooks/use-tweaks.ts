"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark";
export type Accent = "blue" | "cyan" | "indigo" | "steel";
export type Density = "compact" | "default" | "comfortable";
export type NavStyle = "sidebar" | "topbar";

export interface Tweaks {
  theme: Theme;
  accent: Accent;
  density: Density;
  navStyle: NavStyle;
}

const DEFAULTS: Tweaks = {
  theme: "light",
  accent: "blue",
  density: "default",
  navStyle: "sidebar",
};

const STORAGE_KEY = "panelos:tweaks";

function read(): Tweaks {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Tweaks>) };
  } catch {
    return DEFAULTS;
  }
}

export function useTweaks(): [Tweaks, <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void] {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULTS);

  useEffect(() => {
    setTweaks(read());
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-theme", tweaks.theme);
    el.setAttribute("data-accent", tweaks.accent);
    el.setAttribute("data-density", tweaks.density);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks));
    } catch {
      /* noop */
    }
  }, [tweaks]);

  const set = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) =>
    setTweaks((t) => ({ ...t, [key]: value }));

  return [tweaks, set];
}
