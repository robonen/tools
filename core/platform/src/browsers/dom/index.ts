/**
 * @name isEventTarget
 * @category Browsers
 * @description Type guard for a value that is itself an {@link EventTarget}
 * (e.g. `window`, `document`, or an element) — i.e. it can be attached to
 * directly rather than unwrapped from a ref/getter first.
 *
 * @param {unknown} value The value to test
 * @returns {boolean} `true` when `value` is a non-null object exposing `addEventListener`
 *
 * @example
 * if (isEventTarget(target))
 *   target.addEventListener('click', onClick);
 *
 * @since 0.0.5
 */
export function isEventTarget(value: unknown): value is EventTarget {
  return typeof value === 'object' && value !== null && 'addEventListener' in value;
}
