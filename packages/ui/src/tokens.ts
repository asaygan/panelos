// Typed mirror of styles/design-tokens.css. Keep in sync with that file.
// JS consumers can reach for tokens.colors.accent etc.; CSS remains the runtime source.

export type ThemeName = 'light' | 'dark';
export type AccentName = 'blue' | 'cyan' | 'indigo' | 'steel';
export type Density = 'compact' | 'default' | 'comfortable';

export const tokens = {
  colors: {
    canvas: 'var(--c-canvas)',
    surface: 'var(--c-surface)',
    surface2: 'var(--c-surface-2)',
    surface3: 'var(--c-surface-3)',
    line: 'var(--c-line)',
    lineStrong: 'var(--c-line-strong)',

    ink: 'var(--c-ink)',
    ink2: 'var(--c-ink-2)',
    ink3: 'var(--c-ink-3)',
    ink4: 'var(--c-ink-4)',

    accent: 'var(--c-accent)',
    accent700: 'var(--c-accent-700)',
    accent600: 'var(--c-accent-600)',
    accentSoft: 'var(--c-accent-soft)',
    accentLine: 'var(--c-accent-line)',
    accentInk: 'var(--c-accent-ink)',

    ok: 'var(--c-ok)',
    okSoft: 'var(--c-ok-soft)',
    okLine: 'var(--c-ok-line)',
    warn: 'var(--c-warn)',
    warnSoft: 'var(--c-warn-soft)',
    warnLine: 'var(--c-warn-line)',
    fault: 'var(--c-fault)',
    faultSoft: 'var(--c-fault-soft)',
    faultLine: 'var(--c-fault-line)',
    idle: 'var(--c-idle)',
    idleSoft: 'var(--c-idle-soft)',
    idleLine: 'var(--c-idle-line)',
    draft: 'var(--c-draft)',
    draftSoft: 'var(--c-draft-soft)',
    draftLine: 'var(--c-draft-line)',
  },
  radii: {
    xs: 'var(--r-xs)',
    sm: 'var(--r-sm)',
    md: 'var(--r-md)',
    lg: 'var(--r-lg)',
  },
  shadows: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    pop: 'var(--shadow-pop)',
  },
  spacing: {
    rowH: 'var(--row-h)',
    padX: 'var(--pad-x)',
    padY: 'var(--pad-y)',
    gap: 'var(--gap)',
    sidebarW: 'var(--sidebar-w)',
    topbarH: 'var(--topbar-h)',
  },
  fontSize: {
    base: 'var(--fz)',
    sm: 'var(--fz-sm)',
    xs: 'var(--fz-xs)',
    label: 'var(--fz-label)',
  },
  fontFamily: {
    sans: 'var(--font)',
    mono: 'var(--mono)',
  },
  density: {
    compact: { rowH: '30px', padX: '10px', padY: '5px', gap: '10px', fz: '12px', fzSm: '10.5px' },
    default: { rowH: '34px', padX: '12px', padY: '7px', gap: '12px', fz: '12.5px', fzSm: '11px' },
    comfortable: { rowH: '42px', padX: '16px', padY: '11px', gap: '16px', fz: '13.5px', fzSm: '12px' },
  },
  accentPresets: {
    blue: { accent: '#3b82f6', accent700: '#2563eb', accentInk: '#1d4ed8', accentSoft: '#eaf1fe', accentLine: '#c3d8fb' },
    cyan: { accent: '#0ea5e9', accent700: '#0284c7', accentInk: '#0369a1', accentSoft: '#e3f4fd', accentLine: '#b3e0f6' },
    indigo: { accent: '#6366f1', accent700: '#4f46e5', accentInk: '#4338ca', accentSoft: '#ecedfe', accentLine: '#cdcefb' },
    steel: { accent: '#5b6675', accent700: '#414b59', accentInk: '#3a434f', accentSoft: '#eef0f3', accentLine: '#cdd3db' },
  },
} as const;

export type Tokens = typeof tokens;
