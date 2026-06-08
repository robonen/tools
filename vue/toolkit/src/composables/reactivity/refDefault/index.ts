import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref, WritableComputedRef } from 'vue';

export type RefDefaultReturn<T> = WritableComputedRef<T>;

/**
 * @name refDefault
 * @category Reactivity
 * @description Wrap a writable `ref` so that reads fall back to a default value
 * whenever the source holds `null` or `undefined`, while writes pass straight
 * through to the source. The default may itself be reactive (a ref, getter, or
 * plain value), so the fallback can track other state. Implemented as a single
 * writable `computed` — no watchers, no extra refs, nothing to tear down — which
 * keeps it allocation-light and SSR-safe (it never touches the DOM).
 *
 * @param {Ref<T | null | undefined>} source The source ref to read through and write back to
 * @param {MaybeRefOrGetter<T>} defaultValue Fallback returned when the source is `null`/`undefined` (can be reactive)
 * @returns {RefDefaultReturn<T>} A writable computed ref that never reads as `null`/`undefined`
 *
 * @example
 * const raw = ref<string | null>(null);
 * const name = refDefault(raw, 'anonymous');
 * name.value; // 'anonymous'
 * raw.value = 'ada';
 * name.value; // 'ada'
 * name.value = 'grace';
 * raw.value; // 'grace' — writes pass through
 *
 * @example
 * // The default can be reactive
 * const fallback = ref('guest');
 * const user = refDefault(ref<string | null>(null), fallback);
 * fallback.value = 'visitor';
 * user.value; // 'visitor'
 *
 * @since 0.0.15
 */
export function refDefault<T>(
  source: Ref<T | null | undefined>,
  defaultValue: MaybeRefOrGetter<T>,
): RefDefaultReturn<T> {
  return computed<T>({
    get() {
      return source.value ?? toValue(defaultValue);
    },
    set(value) {
      source.value = value;
    },
  });
}
