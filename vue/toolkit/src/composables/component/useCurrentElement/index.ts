import { getCurrentInstance, onMounted, onUpdated } from 'vue';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { computedWithControl } from '@/composables/reactivity/computedWithControl';
import type { ComputedRefWithControl } from '@/composables/reactivity/computedWithControl';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef, MaybeElement, VueInstance } from '@/composables/component/unrefElement';

/** Resolve `false` if `T` is `any`, otherwise `true` — used to detect a typed `$el`. */
type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Infer the resolved element type.
 *
 * When no explicit generic is supplied (`T` stays the broad `MaybeElement`) we
 * fall back to the component instance's `$el` type — unless that is `any`
 * (the un-typed default), in which case we keep `MaybeElement`.
 */
export type UseCurrentElementReturn<
  T extends MaybeElement = MaybeElement,
  R extends VueInstance = VueInstance,
  E extends MaybeElement = MaybeElement extends T
    ? IsAny<R['$el']> extends false ? R['$el'] : T
    : T,
> = ComputedRefWithControl<E>;

/**
 * @name useCurrentElement
 * @category Component
 * @description Reactive root DOM element of the current component instance.
 * Resolves to `vm.$el` (or the unwrapped `rootComponent` ref when provided) and
 * is re-read on `onMounted` and `onUpdated` via a controlled computed — so it
 * stays correct across re-renders without an always-on watcher. Generic over the
 * element type; the type is inferred from the component's `$el` when available.
 * SSR-safe: returns `undefined` until the component is mounted on the client.
 *
 * @param {MaybeComputedElementRef<R>} [rootComponent] Optional ref/getter for an explicit root component or element; defaults to the current instance's `$el`
 * @returns {UseCurrentElementReturn<T, R>} A controlled computed ref of the resolved element, with `.trigger()` / `.peek()` / `.stop()`
 *
 * @example
 * // Inferred element type from the component's root node
 * const el = useCurrentElement();
 * watchEffect(() => console.log(el.value));
 *
 * @example
 * // Explicit element type
 * const el = useCurrentElement<HTMLDivElement>();
 *
 * @example
 * // Track an explicit child component / element ref instead of `$el`
 * const child = useTemplateRef('child');
 * const el = useCurrentElement(child);
 *
 * @since 0.0.15
 */
export function useCurrentElement<
  T extends MaybeElement = MaybeElement,
  R extends VueInstance = VueInstance,
  E extends MaybeElement = MaybeElement extends T
    ? IsAny<R['$el']> extends false ? R['$el'] : T
    : T,
>(
  rootComponent?: MaybeComputedElementRef<R>,
): UseCurrentElementReturn<T, R, E> {
  const vm = getCurrentInstance();

  const currentElement = computedWithControl(
    () => null,
    () => (rootComponent ? unrefElement(rootComponent) : vm?.proxy?.$el) as E,
  ) as UseCurrentElementReturn<T, R, E>;

  if (vm) {
    onMounted(currentElement.trigger);
    onUpdated(currentElement.trigger);
    tryOnScopeDispose(currentElement.stop);
  }

  return currentElement;
}
