// @panelos/config/eslint/nextjs — base + next/core-web-vitals
import base from './base.js';
import next from 'eslint-config-next';

export default [
  ...base,
  ...(Array.isArray(next) ? next : [next]),
];
