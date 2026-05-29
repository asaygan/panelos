// @panelos/config/eslint/node — base + node rules
import base from './base.js';
import nodePlugin from 'eslint-plugin-n';

export default [
  ...base,
  {
    plugins: { n: nodePlugin },
    rules: {
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-unsupported-features/node-builtins': 'warn',
    },
  },
];
