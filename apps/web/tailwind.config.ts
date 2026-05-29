import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: "var(--c-canvas)",
        surface: "var(--c-surface)",
        "surface-2": "var(--c-surface-2)",
        "surface-3": "var(--c-surface-3)",
        line: "var(--c-line)",
        "line-strong": "var(--c-line-strong)",
        ink: "var(--c-ink)",
        "ink-2": "var(--c-ink-2)",
        "ink-3": "var(--c-ink-3)",
        "ink-4": "var(--c-ink-4)",
        accent: "var(--c-accent)",
        "accent-700": "var(--c-accent-700)",
        "accent-soft": "var(--c-accent-soft)",
        "accent-line": "var(--c-accent-line)",
        "accent-ink": "var(--c-accent-ink)",
        ok: "var(--c-ok)",
        "ok-soft": "var(--c-ok-soft)",
        "ok-line": "var(--c-ok-line)",
        warn: "var(--c-warn)",
        "warn-soft": "var(--c-warn-soft)",
        "warn-line": "var(--c-warn-line)",
        fault: "var(--c-fault)",
        "fault-soft": "var(--c-fault-soft)",
        "fault-line": "var(--c-fault-line)",
        idle: "var(--c-idle)",
        "idle-soft": "var(--c-idle-soft)",
        "idle-line": "var(--c-idle-line)",
        draft: "var(--c-draft)",
        "draft-soft": "var(--c-draft-soft)",
        "draft-line": "var(--c-draft-line)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "fz": "var(--fz)",
        "fz-sm": "var(--fz-sm)",
        "fz-xs": "var(--fz-xs)",
        "fz-label": "var(--fz-label)",
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        pop: "var(--shadow-pop)",
      },
      spacing: {
        "row": "var(--row-h)",
        "topbar": "var(--topbar-h)",
        "sidebar": "var(--sidebar-w)",
      },
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities({
        ".blueprint": {
          "background-color": "#0f1f3a",
          "background-image":
            "linear-gradient(rgba(120,170,255,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,.10) 1px, transparent 1px), linear-gradient(rgba(120,170,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,255,.05) 1px, transparent 1px)",
          "background-size": "64px 64px, 64px 64px, 16px 16px, 16px 16px",
        },
        ".mono": {
          "font-family": "var(--mono)",
          "font-feature-settings": "'zero' 1",
          "letter-spacing": "-.2px",
        },
      });
    }),
  ],
};

export default config;
