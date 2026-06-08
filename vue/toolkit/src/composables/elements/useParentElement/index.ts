import { shallowRef, watch } from 'vue';
import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { useCurrentElement } from '@/composables/component/useCurrentElement';

export type UseParentElementReturn
  = Readonly<ShallowRef<HTMLElement | SVGElement | null | undefined>>;

/**
 * @name useParentElement
 * @category Elements
 * @description Reactive `parentElement` of a given element (or the current
 * component instance's root element when no target is supplied). Resolves the
 * target through `unrefElement`, so it accepts plain elements, template refs,
 * component instances, getters and computed refs. A single `immediate` watcher
 * tracks the resolved target and re-reads its parent only when the element
 * itself changes — no extra lifecycle hooks or always-on observers. SSR-safe:
 * stays `undefined` until the target is resolved on the client.
 *
 * @param {MaybeComputedElementRef | MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined>} [element] Target element/ref/getter; defaults to the current instance's root element
 * @returns {UseParentElementReturn} A read-only shallow ref of the resolved parent element
 *
 * @example
 * // Parent of the current component's root element
 * const parent = useParentElement();
 *
 * @example
 * // Parent of a specific template ref
 * const el = useTemplateRef<HTMLElement>('el');
 * const parent = useParentElement(el);
 *
 * @since 0.0.15
 */
export function useParentElement(
  element: MaybeComputedElementRef | MaybeRefOrGetter<HTMLElement | SVGElement | null | undefined> = useCurrentElement<HTMLElement | SVGAElement>(),
): UseParentElementReturn {
  const parentElement = shallowRef<HTMLElement | SVGElement | null | undefined>();

  watch(
    () => unrefElement(element as MaybeComputedElementRef),
    (el) => {
      parentElement.value = (el as Element | null | undefined)?.parentElement;
    },
    { immediate: true, flush: 'post' },
  );

  return parentElement;
}
