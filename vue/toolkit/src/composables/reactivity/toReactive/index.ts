import { isRef, reactive, unref } from 'vue';
import type { MaybeRef, UnwrapNestedRefs } from 'vue';

// Shared, frozen descriptor returned by the proxy's `getOwnPropertyDescriptor`
// trap. Every enumerable own key of the underlying ref resolves to the same
// shape, so we allocate it once at module scope instead of per-lookup.
const OWN_PROPERTY_DESCRIPTOR: PropertyDescriptor = {
  enumerable: true,
  configurable: true,
};

/**
 * @name toReactive
 * @category Reactivity
 * @description Convert a ref of object to a reactive proxy. Property reads and
 * writes pass straight through to the ref's current value, so the proxy stays
 * in sync even if the ref is reassigned to a whole new object. Writing a plain
 * value onto a key that currently holds a ref unwraps into that ref's `.value`.
 * Passing a plain object simply returns `reactive(object)`.
 *
 * @param {MaybeRef<T>} objectRef A ref of object (or a plain object)
 * @returns {UnwrapNestedRefs<T>} A reactive proxy backed by the ref
 *
 * @example
 * const state = ref({ count: 0 });
 * const reactiveState = toReactive(state);
 * reactiveState.count++; // state.value.count === 1
 *
 * @example
 * // survives ref reassignment
 * const obj = ref({ name: 'a' });
 * const r = toReactive(obj);
 * obj.value = { name: 'b' };
 * r.name; // 'b'
 *
 * @since 0.0.15
 */
export function toReactive<T extends object>(
  objectRef: MaybeRef<T>,
): UnwrapNestedRefs<T> {
  if (!isRef(objectRef))
    return reactive(objectRef);

  const proxy = new Proxy({} as T, {
    get(_, key, receiver) {
      return unref(Reflect.get(objectRef.value, key, receiver));
    },
    set(_, key, value) {
      const current = objectRef.value[key as keyof T];

      if (isRef(current) && !isRef(value))
        current.value = value;
      else
        (objectRef.value as Record<PropertyKey, unknown>)[key] = value;

      return true;
    },
    deleteProperty(_, key) {
      return Reflect.deleteProperty(objectRef.value, key);
    },
    has(_, key) {
      return Reflect.has(objectRef.value, key);
    },
    ownKeys() {
      return Reflect.ownKeys(objectRef.value);
    },
    getOwnPropertyDescriptor() {
      return OWN_PROPERTY_DESCRIPTOR;
    },
  });

  return reactive(proxy) as UnwrapNestedRefs<T>;
}
