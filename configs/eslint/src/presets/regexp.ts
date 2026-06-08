import type { FlatConfigArray } from '../types';
import regexpPlugin from 'eslint-plugin-regexp';

/**
 * Regular-expression correctness & optimization rules via
 * [`eslint-plugin-regexp`](https://ota-meshi.github.io/eslint-plugin-regexp/).
 *
 * Applies the plugin's flat `recommended` ruleset — catches buggy/ambiguous
 * patterns (control characters, useless quantifiers, ReDoS-prone constructs)
 * and pushes toward clearer, faster expressions. Included in {@link base} so it
 * applies to every package.
 */
export const regexp: FlatConfigArray = [
  {
    ...regexpPlugin.configs['flat/recommended'],
    name: 'robonen/regexp',
  },
];
