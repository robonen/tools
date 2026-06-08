import { computed, toValue, unref } from 'vue';
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue';

/**
 * The result of {@link isDefined}: a plain boolean acting as a type guard.
 */
export type IsDefinedReturn = boolean;

/**
 * @name isDefined
 * @category Utilities
 * @description Type-guard that checks whether a ref's (or plain value's) current
 * value is neither `null` nor `undefined`, narrowing the source to its
 * `NonNullable` form. Unwraps refs with a single `unref` — no extra reactivity
 * or watchers are created, so it is a cheap synchronous check that is fully
 * SSR-safe. For a reactive guard that tracks changes, use {@link useIsDefined}.
 *
 * @param {ComputedRef<T> | Ref<T> | T} value The ref or value to test
 * @returns {IsDefinedReturn} `true` when the unwrapped value is non-nullish
 *
 * @example
 * const user = ref<User | null>(null);
 * if (isDefined(user)) {
 *   // `user` is now narrowed to `Ref<User>`
 *   console.log(user.value.name);
 * }
 *
 * @example
 * const value = isDefined(maybeNumber) ? maybeNumber.value : 0;
 *
 * @since 0.0.15
 */
export function isDefined<T>(value: ComputedRef<T>): value is ComputedRef<NonNullable<T>>;
export function isDefined<T>(value: Ref<T>): value is Ref<NonNullable<T>>;
export function isDefined<T>(value: T): value is NonNullable<T>;
export function isDefined<T>(value: Ref<T> | T): IsDefinedReturn {
  const resolved = unref(value);
  return resolved !== null && resolved !== undefined;
}

/**
 * The result of {@link useIsDefined}: a readonly computed boolean.
 */
export type UseIsDefinedReturn = ComputedRef<boolean>;

/**
 * @name useIsDefined
 * @category Utilities
 * @description Reactive counterpart to {@link isDefined}. Returns a
 * `ComputedRef<boolean>` that re-evaluates whenever the source ref, getter, or
 * plain value resolves to a non-nullish value. Use this when the definedness
 * itself needs to drive reactivity (templates, watchers, derived state); reach
 * for the synchronous {@link isDefined} when you only need a one-off type guard.
 *
 * @param {MaybeRefOrGetter<T>} value The reactive source (ref, getter, or value)
 * @returns {UseIsDefinedReturn} A computed boolean, `true` while the source is non-nullish
 *
 * @example
 * const data = ref<Data | null>(null);
 * const ready = useIsDefined(data);
 * watch(ready, isReady => isReady && render());
 *
 * @example
 * const hasResult = useIsDefined(() => store.result);
 *
 * @since 0.0.15
 */
export function useIsDefined<T>(value: MaybeRefOrGetter<T>): UseIsDefinedReturn {
  return computed(() => {
    const resolved = toValue(value);
    return resolved !== null && resolved !== undefined;
  });
}
