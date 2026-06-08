import { computed, toValue } from 'vue';
import type { ComputedRef, MaybeRefOrGetter } from 'vue';

export type UseArrayJoinReturn = ComputedRef<string>;

/**
 * @name useArrayJoin
 * @category Array
 * @description Reactive `Array.prototype.join`, with an optional reactive separator.
 *
 * @param {MaybeRefOrGetter<MaybeRefOrGetter<unknown>[]>} list The source array (items can be reactive)
 * @param {MaybeRefOrGetter<string>} [separator] A reactive separator placed between adjacent elements (defaults to `,`)
 * @returns {UseArrayJoinReturn} A computed string of all elements joined; empty string when the array is empty
 *
 * @example
 * const list = ref(['a', 'b', 'c']);
 * const sep = ref('-');
 * const joined = useArrayJoin(list, sep); // 'a-b-c'
 *
 * @since 0.0.15
 */
export function useArrayJoin(
  list: MaybeRefOrGetter<Array<MaybeRefOrGetter<unknown>>>,
  separator?: MaybeRefOrGetter<string>,
): UseArrayJoinReturn {
  return computed(() => {
    const resolved = toValue(list);

    // `Array.prototype.join` already stringifies each element, but resolving
    // reactive items first lets the computed track per-item ref dependencies.
    let needsUnwrap = false;
    for (const item of resolved) {
      if (typeof item === 'function' || (typeof item === 'object' && item !== null && 'value' in item)) {
        needsUnwrap = true;
        break;
      }
    }

    const source = needsUnwrap ? resolved.map(item => toValue(item)) : resolved;
    return source.join(toValue(separator));
  });
}
