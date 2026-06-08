import { computed, isRef, reactive, unref } from 'vue';
import type { ComputedGetter, UnwrapNestedRefs } from 'vue';

export type ReactiveComputedReturn<T extends object>
  = UnwrapNestedRefs<T>;

/**
 * @name reactiveComputed
 * @category Reactivity
 * @description Computed that resolves to a reactive object whose individual
 * fields stay reactive — read a single property and only that property is
 * tracked, instead of the whole getter re-running on every access.
 *
 * The getter is wrapped in a single cached `computed`, so the object is
 * recomputed only when one of its reactive dependencies changes. The returned
 * value is a `reactive` proxy over that computed: destructuring with `toRefs`,
 * spreading and writing back individual fields all work as on a normal
 * `reactive` object.
 *
 * @param {ComputedGetter<T>} getter Factory returning the object to expose reactively
 * @returns {ReactiveComputedReturn<T>} A reactive object backed by the cached computed
 *
 * @example
 * const state = reactiveComputed(() => ({
 *   foo: count.value,
 *   bar: count.value * 2,
 * }));
 * // reading state.bar only depends on `bar`
 *
 * @example
 * // nested refs returned by the getter are unwrapped and kept writable
 * const name = ref('a');
 * const obj = reactiveComputed(() => ({ name }));
 * obj.name; // 'a'
 * obj.name = 'b'; // writes through to name.value
 *
 * @since 0.0.15
 */
export function reactiveComputed<T extends object>(
  getter: ComputedGetter<T>,
): ReactiveComputedReturn<T> {
  const source = computed<T>(getter);

  // A Proxy over the computed's current value: each trap reads
  // `source.value` lazily, so only the accessed key is tracked and the proxy
  // itself is created exactly once (no re-creation per recompute).
  const proxy = new Proxy({} as T, {
    get(_, key, receiver) {
      return unref(Reflect.get(source.value, key, receiver));
    },
    set(_, key, value) {
      const current = source.value as Record<PropertyKey, unknown>;
      const existing = current[key];

      // Preserve ref identity: assigning a raw value to a field that holds a
      // ref writes through to `.value` instead of clobbering the ref.
      if (isRef(existing) && !isRef(value))
        existing.value = value;
      else
        current[key] = value;

      return true;
    },
    deleteProperty(_, key) {
      return Reflect.deleteProperty(source.value, key);
    },
    has(_, key) {
      return Reflect.has(source.value, key);
    },
    ownKeys() {
      return Reflect.ownKeys(source.value);
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true,
      };
    },
  });

  return reactive(proxy) as ReactiveComputedReturn<T>;
}
