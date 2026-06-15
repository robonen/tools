import type { CheckedState } from './context';

/**
 * Shared checkbox state helpers, used by both `CheckboxRoot` and
 * `CheckboxIndicator` so the indeterminate/`data-state` mapping cannot drift
 * between the two parts.
 */

/** Narrows a {@link CheckedState} to the `'indeterminate'` literal. */
export function isIndeterminate(checked?: CheckedState): checked is 'indeterminate' {
  return checked === 'indeterminate';
}

/** Canonical `data-state` value for a {@link CheckedState}. */
export function getState(checked: CheckedState): 'checked' | 'unchecked' | 'indeterminate' {
  if (isIndeterminate(checked)) return 'indeterminate';
  return checked ? 'checked' : 'unchecked';
}
