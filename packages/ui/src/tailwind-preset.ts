// Tailwind preset that maps PanelOS CSS variables to Tailwind theme keys.
// Apps include this via tailwind.config.{js,ts}:
//   import preset from '@panelos/ui/tailwind-preset';
//   export default { presets: [preset], content: [...] };

import type { Config } from 'tailwindcss';

const preset = {
  darkMode: ['selector', 'html[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--c-canvas)',
        surface: {
          DEFAULT: 'var(--c-surface)',
          2: 'var(--c-surface-2)',
          3: 'var(--c-surface-3)',
        },
        line: {
          DEFAULT: 'var(--c-line)',
          strong: 'var(--c-line-strong)',
        },
        ink: {
          DEFAULT: 'var(--c-ink)',
          2: 'var(--c-ink-2)',
          3: 'var(--c-ink-3)',
          4: 'var(--c-ink-4)',
        },
        accent: {
          DEFAULT: 'var(--c-accent)',
          600: 'var(--c-accent-600)',
          700: 'var(--c-accent-700)',
          soft: 'var(--c-accent-soft)',
          line: 'var(--c-accent-line)',
          ink: 'var(--c-accent-ink)',
        },
        ok: {
          DEFAULT: 'var(--c-ok)',
          soft: 'var(--c-ok-soft)',
          line: 'var(--c-ok-line)',
        },
        warn: {
          DEFAULT: 'var(--c-warn)',
          soft: 'var(--c-warn-soft)',
          line: 'var(--c-warn-line)',
        },
        fault: {
          DEFAULT: 'var(--c-fault)',
          soft: 'var(--c-fault-soft)',
          line: 'var(--c-fault-line)',
        },
        idle: {
          DEFAULT: 'var(--c-idle)',
          soft: 'var(--c-idle-soft)',
          line: 'var(--c-idle-line)',
        },
        draft: {
          DEFAULT: 'var(--c-draft)',
          soft: 'var(--c-draft-soft)',
          line: 'var(--c-draft-line)',
        },
      },
      borderRadius: {
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        pop: 'var(--shadow-pop)',
      },
      fontFamily: {
        sans: ['var(--font)'],
        mono: ['var(--mono)'],
      },
      fontSize: {
        'pos-xs': ['var(--fz-xs)', { lineHeight: '1.2' }],
        'pos-sm': ['var(--fz-sm)', { lineHeight: '1.3' }],
        'pos-base': ['var(--fz)', { lineHeight: '1.35' }],
        'pos-label': ['var(--fz-label)', { lineHeight: '1.2' }],
      },
      spacing: {
        'row-h': 'var(--row-h)',
        'pad-x': 'var(--pad-x)',
        'pad-y': 'var(--pad-y)',
        'sidebar-w': 'var(--sidebar-w)',
        'topbar-h': 'var(--topbar-h)',
      },
    },
  },
} satisfies Partial<Config>;

export default preset;
