import type { OxlintConfig } from '../types';

/**
 * Node.js-specific rules.
 */
export const node: OxlintConfig = {
  plugins: ['node'],

  env: {
    node: true,
  },

  rules: {
    'node/no-exports-assign': 'error',
    'node/no-new-require': 'error',
  },
};
