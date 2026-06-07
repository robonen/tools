import { ref, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { createFilterWrapper, throttleFilter } from '@/utils/filters';

export type RefThrottledReturn<T = any> = Ref<T>;

/**
 * @name refThrottled
 * @category Reactivity
 * @description A ref whose value updates are throttled. The returned ref mirrors
 * the source but propagates changes at most once per `delay` window, making it
 * useful for rate-limiting reactive updates driven by high-frequency events such
 * as `scroll` or `resize`.
 *
 * @param {MaybeRefOrGetter<T>} source The ref, getter, or value to watch and throttle
 * @param {number} [delay=200] A zero-or-greater delay in milliseconds; values around 100–250 (or higher) are most useful
 * @param {boolean} [trailing=true] Update the value again on the trailing edge after the window elapses
 * @param {boolean} [leading=true] Update the value on the leading edge of the window
 * @returns {RefThrottledReturn<T>} A ref reflecting the throttled source value
 *
 * @example
 * const input = ref('');
 * const throttled = refThrottled(input, 1000);
 *
 * @example
 * const scrollY = ref(0);
 * const throttledY = refThrottled(scrollY, 100, true, false);
 *
 * @since 0.0.15
 */
export function refThrottled<T = any>(
  source: MaybeRefOrGetter<T>,
  delay = 200,
  trailing = true,
  leading = true,
): RefThrottledReturn<T> {
  const throttled = ref(toValue(source)) as Ref<T>;

  // A non-positive delay disables throttling: mirror the source synchronously.
  if (delay <= 0) {
    watch(() => toValue(source), (value) => {
      throttled.value = value;
    });

    return throttled;
  }

  const update = createFilterWrapper(
    throttleFilter(delay, trailing, leading),
    () => {
      throttled.value = toValue(source);
    },
  );

  watch(() => toValue(source), () => {
    update();
  });

  return throttled;
}
