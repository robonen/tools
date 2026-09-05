import { camelize, computed, getCurrentInstance } from 'vue';
import type { ComputedRef } from 'vue';

/**
 * @name useForwardProps
 * @category Component
 * @description Forward a component's props to a child without the ones the
 * parent never passed. Vue casts an absent `Boolean` prop to `false` and fills
 * the rest with `undefined`, so spreading `props` (or a `defineProps`
 * destructuring rest) onto a child overrides the child's own defaults —
 * `avoidCollisions = true` on `PopperContent` silently became `false` in every
 * composite that re-declared and spread it. Only props present on the
 * component's own vnode are forwarded, matched by camelCase name, so a parent
 * writing `side-offset` counts as having passed `sideOffset`.
 *
 * @param {T} props The props object, or a `defineProps` destructuring rest, to forward
 * @returns {ComputedRef<Partial<T>>} A reactive subset holding only the props the parent actually passed
 *
 * @example
 * const { forceMount = false, ...popperProps } = defineProps<Props>();
 * const forwarded = useForwardProps(popperProps);
 * // <PopperContent v-bind="forwarded">
 *
 * @since 0.2.1
 */
export function useForwardProps<T extends Record<string, unknown>>(props: T): ComputedRef<Partial<T>> {
  const instance = getCurrentInstance();

  return computed(() => {
    const assigned = new Set(Object.keys(instance?.vnode.props ?? {}).map(camelize));
    const forwarded: Partial<T> = {};

    for (const key of Object.keys(props) as Array<keyof T & string>) {
      // Read every prop, not only the assigned ones: a prop the parent starts
      // passing later must re-run this computed, and the read is its only link.
      const value = props[key];
      if (assigned.has(key))
        forwarded[key] = value;
    }

    return forwarded;
  });
}
