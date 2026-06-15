import { isNull, isNumber, isUndefined } from '@robonen/stdlib';

/** Fallback maximum used when `max` is omitted or invalid. */
export const DEFAULT_MAX = 100;

/** `null`/`undefined` mark an indeterminate progress bar. */
export function isNullish(value: unknown): value is null | undefined {
  return isNull(value) || isUndefined(value);
}

/** A real, finite numeric value (filters `NaN`/`Infinity`). */
export function isFiniteNumber(value: unknown): value is number {
  return isNumber(value) && Number.isFinite(value);
}

const VALUE_MESSAGE = (value: unknown, max: number): string =>
  `Invalid \`modelValue\` of \`${String(value)}\` supplied to ProgressRoot. `
  + `The value must be a finite number between 0 and \`max\` (${max}), `
  + 'or `null`/`undefined` for an indeterminate bar. Defaulting to `null`.';

const MAX_MESSAGE = (max: unknown): string =>
  `Invalid \`max\` of \`${String(max)}\` supplied to ProgressRoot. `
  + `Only finite numbers greater than 0 are valid. Defaulting to \`${DEFAULT_MAX}\`.`;

/**
 * Resolve a usable `max`: a finite number greater than `0`, otherwise the
 * default. Warns once in dev when an invalid value is supplied. Compiled out of
 * production via the `__DEV__` global.
 */
export function resolveMax(max: number | undefined): number {
  if (isUndefined(max)) return DEFAULT_MAX;
  if (isFiniteNumber(max) && max > 0) return max;

  if (__DEV__) console.error(MAX_MESSAGE(max));
  return DEFAULT_MAX;
}

/**
 * Resolve a usable value against an already-resolved `max`: pass through
 * nullish (indeterminate) values, clamp finite numbers into `[0, max]`, and
 * coerce anything else (`NaN`, non-numbers) to `null`. Warns once in dev when
 * coercing an unusable value. Compiled out of production via `__DEV__`.
 */
export function resolveValue(value: number | null | undefined, max: number): number | null {
  if (isNullish(value)) return null;
  if (isFiniteNumber(value)) {
    if (value < 0) return 0;
    if (value > max) return max;
    return value;
  }

  if (__DEV__) console.error(VALUE_MESSAGE(value, max));
  return null;
}
