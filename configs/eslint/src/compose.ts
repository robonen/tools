import type { FlatConfigArray, FlatConfigInput } from './types';

/**
 * Compose multiple ESLint flat configurations into a single flat config array.
 *
 * ESLint flat config is an ordered array where later entries override earlier
 * ones, so composition is a flatten: each preset (an array) and each inline
 * override (a single object) are concatenated in order. `undefined`/`null`
 * inputs are skipped, allowing conditional spreads.
 *
 * @example
 * ```ts
 * import { compose, base, typescript, vue } from '@robonen/eslint';
 *
 * export default compose(base, typescript, vue, {
 *   rules: { 'no-console': 'off' },
 * });
 * ```
 */
export function compose(...configs: Array<FlatConfigInput | false | null | undefined>): FlatConfigArray {
  const result: FlatConfigArray = [];

  for (const config of configs) {
    if (!config)
      continue;

    if (Array.isArray(config))
      result.push(...config);
    else
      result.push(config);
  }

  return result;
}
