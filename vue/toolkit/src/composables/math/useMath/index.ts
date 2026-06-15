import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

/**
 * Keys of `Math` that resolve to callable methods (excludes numeric constants
 * such as `Math.PI` or `Math.E`).
 */
export type UseMathKey
  // `(...args: any[]) => any` is the idiomatic "any callable" matcher; `unknown`/`never`
  // here would fail to match `Math`'s contravariant method params and select nothing.
  = keyof { [K in keyof Math as Math[K] extends (...args: any[]) => any ? K : never]: unknown };

/**
 * Maps each argument of a `Math` method to a reactive equivalent
 * (`MaybeRefOrGetter`), so callers may pass plain values, refs or getters.
 */
export type UseMathArgs<K extends UseMathKey>
  = Math[K] extends (...args: infer A) => unknown
    ? { [I in keyof A]: MaybeRefOrGetter<A[I]> }
    : never;

/**
 * Reactive result of the wrapped `Math` method.
 */
export type UseMathReturn<K extends UseMathKey>
  = Math[K] extends (...args: never[]) => infer R ? ComputedRef<R> : never;

/**
 * @name useMath
 * @category Math
 * @description Reactive wrapper over any callable `Math.<key>` method. Each
 * argument may be a plain value, a ref or a getter; the result recomputes
 * lazily whenever a reactive input changes.
 *
 * @param {UseMathKey} key The name of the `Math` method to wrap (e.g. `'max'`, `'round'`, `'hypot'`).
 * @param {...UseMathArgs} args The reactive arguments forwarded to the method.
 * @returns {UseMathReturn} A computed ref holding the method's result.
 *
 * @example
 * const a = ref(2);
 * const b = ref(8);
 * const max = useMath('max', a, b); // ComputedRef<number> -> 8
 *
 * @example
 * // getters and plain values mix freely
 * const value = ref(-4.7);
 * const rounded = useMath('round', value);   // 5 -> -5
 * const absVal = useMath('abs', () => value.value); // 4.7
 *
 * @example
 * // variadic methods
 * const sides = ref([3, 4]);
 * const dist = useMath('hypot', () => sides.value[0], () => sides.value[1]); // 5
 *
 * @since 0.0.15
 */
export function useMath<K extends UseMathKey>(
  key: K,
  ...args: UseMathArgs<K>
): UseMathReturn<K> {
  return computed(
    () => (Math[key] as unknown as (...a: unknown[]) => unknown)(...args.map(arg => toValue(arg))),
  ) as UseMathReturn<K>;
}
