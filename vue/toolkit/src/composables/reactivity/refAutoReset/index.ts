import { customRef, toValue } from 'vue';
import type { MaybeRefOrGetter, Ref } from 'vue';
import { useTimeoutFn } from '@/composables/animation/useTimeoutFn';

export type RefAutoResetReturn<T> = Ref<T>;

/**
 * @name refAutoReset
 * @category Reactivity
 * @description Create a ref that resets to its default value after a delay
 * since the last write. Each set restarts the timer; reading is reactive.
 *
 * @param {MaybeRefOrGetter<T>} defaultValue The value the ref resets to (resolved each reset, can be reactive)
 * @param {MaybeRefOrGetter<number>} [afterMs=10000] Delay in milliseconds before resetting (resolved on each set, can be reactive)
 * @returns {RefAutoResetReturn<T>} A ref that auto-resets to `defaultValue`
 *
 * @example
 * const message = refAutoReset('', 1000);
 * message.value = 'Saved!'; // reverts to '' after 1000ms
 *
 * @example
 * // Reactive delay and default
 * const delay = ref(2000);
 * const fallback = ref('idle');
 * const status = refAutoReset(fallback, delay);
 *
 * @since 0.0.15
 */
export function refAutoReset<T>(
  defaultValue: MaybeRefOrGetter<T>,
  afterMs: MaybeRefOrGetter<number> = 10000,
): RefAutoResetReturn<T> {
  return customRef<T>((track, trigger) => {
    let value: T = toValue(defaultValue);

    const { start, stop } = useTimeoutFn(
      () => {
        value = toValue(defaultValue);
        trigger();
      },
      afterMs,
      { immediate: false },
    );

    return {
      get() {
        track();
        return value;
      },
      set(newValue) {
        value = newValue;
        trigger();

        stop();
        start();
      },
    };
  });
}
