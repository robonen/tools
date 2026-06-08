import { computed, shallowRef } from 'vue';
import type { ShallowRef } from 'vue';
import type { ConfigurableWindow } from '@/types';
import { defaultWindow } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseElementHoverOptions extends ConfigurableWindow {
  /**
   * Delay in milliseconds before flipping the state to hovered on `mouseenter`.
   *
   * @default 0
   */
  delayEnter?: number;

  /**
   * Delay in milliseconds before flipping the state to not-hovered on `mouseleave`.
   *
   * @default 0
   */
  delayLeave?: number;
}

export type UseElementHoverReturn = ShallowRef<boolean>;

/**
 * @name useElementHover
 * @category Sensors
 * @description Reactive hover state of an element, driven by `mouseenter` /
 * `mouseleave`. Supports independent enter/leave delays to debounce flicker.
 *
 * @param {MaybeComputedElementRef} target Element to track (ref, getter, or component instance)
 * @param {UseElementHoverOptions} [options={}] Options (`delayEnter`, `delayLeave`, `window`)
 * @returns {UseElementHoverReturn} Reactive hover state ref
 *
 * @example
 * const el = useTemplateRef('el');
 * const isHovered = useElementHover(el);
 *
 * @example
 * const isHovered = useElementHover(el, { delayEnter: 100, delayLeave: 200 });
 *
 * @since 0.0.15
 */
export function useElementHover(
  target: MaybeComputedElementRef,
  options: UseElementHoverOptions = {},
): UseElementHoverReturn {
  const {
    delayEnter = 0,
    delayLeave = 0,
    window = defaultWindow,
  } = options;

  const isHovered = shallowRef(false);

  let timer: ReturnType<typeof setTimeout> | undefined;

  const clear = (): void => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  const toggle = (entering: boolean): void => {
    const delay = entering ? delayEnter : delayLeave;

    clear();

    if (delay)
      timer = setTimeout(() => { isHovered.value = entering; }, delay);
    else
      isHovered.value = entering;
  };

  // SSR / no DOM: return a static, never-updating ref.
  if (!window)
    return isHovered;

  const targetElement = computed(() => unrefElement(target) as HTMLElement | undefined | null);

  useEventListener(targetElement, 'mouseenter', () => toggle(true), { passive: true });
  useEventListener(targetElement, 'mouseleave', () => toggle(false), { passive: true });

  tryOnScopeDispose(clear);

  return isHovered;
}
