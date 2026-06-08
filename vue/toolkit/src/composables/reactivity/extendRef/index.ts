import { isRef } from 'vue';
import type { Ref, ShallowUnwrapRef } from 'vue';

export interface ExtendRefOptions<Unwrap extends boolean = boolean> {
  /**
   * Whether the extended properties are enumerable.
   *
   * @default false
   */
  enumerable?: boolean;

  /**
   * Whether to unwrap (auto-`.value`) extended properties that are themselves refs.
   *
   * @default true
   */
  unwrap?: Unwrap;
}

export type ExtendRefReturn<R extends Ref<unknown>, Extend extends object, Unwrap extends boolean>
  = Unwrap extends false ? (R & ShallowUnwrapRef<Extend>) : (R & Extend);

/**
 * @name extendRef
 * @category Reactivity
 * @description Attach extra (optionally reactive) attributes to a ref while keeping it a usable ref.
 *
 * @param {Ref<T>} ref The ref to extend
 * @param {object} extend The properties to attach; ref-valued props are unwrapped by default
 * @param {ExtendRefOptions} [options={}] `enumerable` (default `false`) and `unwrap` (default `true`)
 * @returns {Ref<T> & Extend} The same ref instance, now carrying the extended properties
 *
 * @example
 * const myRef = ref('content');
 * const extended = extendRef(myRef, { foo: 'bar' });
 * extended.value; // 'content'
 * extended.foo; // 'bar'
 *
 * @example
 * // reactive extension: unwrapped two-way by default
 * const count = ref(0);
 * const extended = extendRef(count, { double: computed(() => count.value * 2) });
 * extended.double; // 0 (no .value needed)
 *
 * @example
 * // keep refs as refs with unwrap: false
 * const extended = extendRef(ref(0), { inner: ref(1) }, { unwrap: false });
 * extended.inner.value; // 1
 *
 * @since 0.0.15
 */
export function extendRef<R extends Ref<unknown>, Extend extends object, Options extends ExtendRefOptions<false>>(ref: R, extend: Extend, options: Options): R & ShallowUnwrapRef<Extend>;
export function extendRef<R extends Ref<unknown>, Extend extends object, Options extends ExtendRefOptions>(ref: R, extend: Extend, options?: Options): R & Extend;
export function extendRef<R extends Ref<unknown>, Extend extends object>(
  ref: R,
  extend: Extend,
  options: ExtendRefOptions = {},
): R & Extend {
  const { enumerable = false, unwrap = true } = options;

  for (const key in extend) {
    if (key === 'value')
      continue;

    const value = extend[key];

    if (unwrap && isRef(value)) {
      Object.defineProperty(ref, key, {
        get() {
          return value.value;
        },
        set(v) {
          value.value = v;
        },
        enumerable,
        configurable: true,
      });
    }
    else {
      Object.defineProperty(ref, key, {
        value,
        enumerable,
        configurable: true,
        writable: true,
      });
    }
  }

  return ref as R & Extend;
}
