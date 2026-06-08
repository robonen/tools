import type { Linter } from 'eslint';

/**
 * A single ESLint flat configuration object.
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */
export type FlatConfig = Linter.Config;

/**
 * An array of ESLint flat configuration objects — the shape ESLint
 * expects from an `eslint.config.ts` default export.
 */
export type FlatConfigArray = FlatConfig[];

/**
 * A flat config rules record (`Partial<Linter.RulesRecord>`).
 */
export type Rules = NonNullable<FlatConfig['rules']>;

/**
 * Accepts either a single flat config object or an array of them.
 *
 * Used by {@link compose} so presets (arrays) and inline overrides
 * (single objects) can be passed interchangeably.
 */
export type FlatConfigInput = FlatConfig | FlatConfigArray;
