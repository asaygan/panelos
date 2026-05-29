import { defineConfig } from 'tsup';
import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'tailwind-preset': 'src/tailwind-preset.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  treeshake: true,
  external: ['tailwindcss'],
  onSuccess: async () => {
    // Copy CSS assets next to the dist output (we publish via /styles entry, but
    // also expose them under dist/styles for tools that resolve relative paths).
    const stylesSrc = resolve('styles');
    const stylesDest = resolve('dist/styles');
    mkdirSync(stylesDest, { recursive: true });
    cpSync(stylesSrc, stylesDest, { recursive: true });
  },
});
