import type { Density } from './tokens.js';

/**
 * Set `data-density` on the given element (or <html> by default). The CSS in
 * design-tokens.css picks up the attribute and adjusts row height / paddings.
 */
export function applyDensity(el: HTMLElement, density: Density): void {
  if (density === 'default') {
    el.removeAttribute('data-density');
  } else {
    el.setAttribute('data-density', density);
  }
}
