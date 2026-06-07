import type { FlatConfigArray } from '../types';
import nodePlugin from 'eslint-plugin-n';
import globals from 'globals';

/**
 * Node.js-specific configuration.
 *
 * Registers `eslint-plugin-n` (the maintained successor of `eslint-plugin-node`)
 * under the `n` namespace and adds Node globals.
 */
export const node: FlatConfigArray = [
  {
    name: 'robonen/node',
    plugins: {
      n: nodePlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'n/no-exports-assign': 'error',
      'n/no-new-require': 'error',
    },
  },
];
