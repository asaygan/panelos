import type { AccentName, ThemeName } from './tokens.js';

/** Toggle the light/dark theme on <html>. */
export function applyTheme(theme: ThemeName, root: HTMLElement = document.documentElement): void {
  if (theme === 'light') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

/** Switch the accent preset on <html>. */
export function applyAccent(accent: AccentName, root: HTMLElement = document.documentElement): void {
  root.setAttribute('data-accent', accent);
}
