import { computed, shallowRef } from 'vue';
import type { ComputedRef } from 'vue';
import { defaultWindow } from '@/types';
import type { ConfigurableWindow } from '@/types';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { useEventListener } from '@/composables/browser/useEventListener';

export interface UseFocusWithinOptions extends ConfigurableWindow {}

export interface UseFocusWithinReturn {
  /**
   * Whether the element or any of its descendants currently hold focus.
   */
  focused: ComputedRef<boolean>;
}

/**
 * @name useFocusWithin
 * @category Sensors
 * @description Reactive tracking of whether an element or any of its
 * descendants are focused, backed by the `focusin`/`focusout` events.
 *
 * @param {MaybeComputedElementRef} target Element to track
 * @param {UseFocusWithinOptions} [options={}] Options
 * @returns {UseFocusWithinReturn} `{ focused }` reactive focus-within state
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * const { focused } = useFocusWithin(el);
 *
 * @since 0.0.15
 */
export function useFocusWithin(
  target: MaybeComputedElementRef,
  options: UseFocusWithinOptions = {},
): UseFocusWithinReturn {
  const { window = defaultWindow } = options;

  const _focused = shallowRef(false);
  const focused = computed(() => _focused.value);

  const activeElement = window?.document?.activeElement;

  const targetElement = computed(() => unrefElement(target) as HTMLElement | undefined | null);

  if (window) {
    useEventListener(targetElement, 'focusin', () => {
      _focused.value = true;
    }, { passive: true });

    useEventListener(targetElement, 'focusout', (event: FocusEvent) => {
      // After focus leaves a descendant, confirm focus did not simply move to
      // another descendant. `event.relatedTarget` carries the element about to
      // receive focus; if it is still inside `target` we remain focused. We
      // also consult the `:focus-within` pseudo-class as a fallback for cases
      // where `relatedTarget` is unavailable.
      const el = unrefElement(target);

      if (!el) {
        _focused.value = false;
        return;
      }

      const next = event.relatedTarget as Node | null;
      if (next && el.contains(next)) {
        _focused.value = true;
        return;
      }

      _focused.value = el.matches?.(':focus-within') ?? false;
    }, { passive: true });
  }

  // Reflect focus that already lives inside the target on initialization.
  const el = unrefElement(target);
  if (el && activeElement && (el === activeElement || el.contains(activeElement)))
    _focused.value = true;

  return {
    focused,
  };
}
