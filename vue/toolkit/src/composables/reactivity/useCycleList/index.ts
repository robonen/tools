import { computed, shallowRef, toRef, toValue, watch } from 'vue';
import type { MaybeRef, MaybeRefOrGetter, Ref, ShallowRef, WritableComputedRef } from 'vue';

export interface UseCycleListOptions<T> {
  /**
   * The initial value of the state. Defaults to the first item in the list.
   * A ref can be provided to reuse it.
   */
  initialValue?: MaybeRef<T>;

  /**
   * Index used when the current value is not found in the list.
   *
   * @default 0
   */
  fallbackIndex?: number;

  /**
   * Custom function to resolve the index of a value in the list.
   */
  getIndexOf?: (value: T, list: T[]) => number;
}

export interface UseCycleListReturn<T> {
  /**
   * The currently selected item.
   */
  state: ShallowRef<T>;

  /**
   * The index of the currently selected item. Writable — assigning jumps to that index.
   */
  index: WritableComputedRef<number>;

  /**
   * Move forward by `n` items (wraps around). Defaults to 1.
   */
  next: (n?: number) => T;

  /**
   * Move backward by `n` items (wraps around). Defaults to 1.
   */
  prev: (n?: number) => T;

  /**
   * Move by a signed `delta` relative to the current item (wraps around). Defaults to 1.
   */
  shift: (delta?: number) => T;

  /**
   * Jump to a specific index (wraps around out-of-range/negative indices).
   */
  go: (i: number) => T;
}

/**
 * @name useCycleList
 * @category Reactivity
 * @description Cycle through a list of items, with `next`/`prev`/`shift`/`go` controls.
 * Supports a reactive list — the index is kept valid when the list changes.
 *
 * @param {MaybeRefOrGetter<T[]>} list The list to cycle through (can be reactive)
 * @param {UseCycleListOptions<T>} [options={}] Options
 * @returns {UseCycleListReturn<T>} State and controls
 *
 * @example
 * const { state, next, prev } = useCycleList(['a', 'b', 'c']);
 * next(); // state.value === 'b'
 *
 * @example
 * const { index } = useCycleList(['a', 'b', 'c']);
 * index.value = 2; // jump directly to 'c'
 *
 * @since 0.0.15
 */
export function useCycleList<T>(
  list: MaybeRefOrGetter<T[]>,
  options: UseCycleListOptions<T> = {},
): UseCycleListReturn<T> {
  const { fallbackIndex = 0, getIndexOf } = options;

  // Normalize the source once: a stable ref we can watch and read cheaply,
  // regardless of whether the caller passed an array, a ref, or a getter.
  const listRef = toRef(list) as Ref<T[]>;

  const state = shallowRef(
    options.initialValue !== undefined ? toValue(options.initialValue) : listRef.value[0],
  ) as ShallowRef<T>;

  const index = computed<number>({
    get() {
      const targetList = listRef.value;

      let position = getIndexOf
        ? getIndexOf(state.value, targetList)
        : targetList.indexOf(state.value);

      if (position < 0)
        position = fallbackIndex;

      return position;
    },
    set(value) {
      set(value);
    },
  });

  function set(i: number): T {
    const targetList = listRef.value;
    const length = targetList.length;

    // Nothing to select — keep the current state untouched (avoids NaN indexing).
    if (length === 0)
      return state.value;

    // Wrap negative and out-of-range indices into bounds.
    const position = ((i % length) + length) % length;
    const value = targetList[position]!;

    state.value = value;
    return value;
  }

  function go(i: number): T {
    return set(i);
  }

  function shift(delta = 1): T {
    return set(index.value + delta);
  }

  function next(n = 1): T {
    return shift(n);
  }

  function prev(n = 1): T {
    return shift(-n);
  }

  // Keep the state in sync when the list shrinks/changes: re-resolving the
  // current index falls back automatically if the active item disappeared.
  watch(listRef, () => set(index.value));

  return {
    state,
    index,
    next,
    prev,
    shift,
    go,
  };
}
