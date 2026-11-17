import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/** Token-backed color with opacity support. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        background: token("background"),
        surface: {
          DEFAULT: token("surface"),
          2: token("surface-2"),
          3: token("surface-3"),
        },
        border: {
          DEFAULT: token("border"),
          strong: token("border-strong"),
        },
        foreground: token("foreground"),
        muted: token("muted"),
        subtle: token("subtle"),
        ring: token("ring"),
        primary: {
          DEFAULT: token("primary"),
          hover: token("primary-hover"),
          soft: token("primary-soft"),
          foreground: token("primary-foreground"),
        },
        success: { DEFAULT: token("success"), soft: token("success-soft") },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft") },
        danger: { DEFAULT: token("danger"), soft: token("danger-soft") },
        info: { DEFAULT: token("info"), soft: token("info-soft") },
        sidebar: {
          DEFAULT: token("sidebar"),
          foreground: token("sidebar-foreground"),
          muted: token("sidebar-muted"),
          active: token("sidebar-active"),
          border: token("sidebar-border"),
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px" }],
        xs: ["12px", { lineHeight: "16px" }],
        sm: ["13px", { lineHeight: "20px" }],
        base: ["14px", { lineHeight: "20px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["18px", { lineHeight: "26px" }],
        "2xl": ["22px", { lineHeight: "28px" }],
        "3xl": ["28px", { lineHeight: "34px" }],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius)",
        md: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        lg: "var(--shadow-lg)",
      },
      spacing: {
        sidebar: "248px",
        "sidebar-collapsed": "60px",
        topbar: "52px",
      },
      keyframes: {
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "none" } },
        "slide-in-bottom": { from: { transform: "translateY(100%)" }, to: { transform: "none" } },
      },
      animation: {
        "slide-in-right": "slide-in-right 180ms ease-out",
        "slide-in-bottom": "slide-in-bottom 200ms ease-out",
      },
    },
  },
  plugins: [animate],
};

export default config;
