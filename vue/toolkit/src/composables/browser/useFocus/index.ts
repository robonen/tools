import { computed, shallowRef, watch } from 'vue';
import type { WritableComputedRef } from 'vue';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { useEventListener } from '@/composables/browser/useEventListener';
import type { ConfigurableWindow } from '@/types';

export interface UseFocusOptions extends ConfigurableWindow {
  /**
   * Initial focus state. When `true`, the element is focused on mount.
   *
   * @default false
   */
  initialValue?: boolean;
  /**
   * Only consider the element focused when it matches `:focus-visible`,
   * mirroring the browser's keyboard-focus heuristics.
   *
   * @default false
   */
  focusVisible?: boolean;
  /**
   * Prevent the browser from scrolling the element into view when focusing it.
   *
   * @default false
   */
  preventScroll?: boolean;
}

export interface UseFocusReturn {
  /**
   * Reactive focus state. Read it to know whether the target is focused, or
   * write to it to programmatically focus (`true`) or blur (`false`) the target.
   */
  focused: WritableComputedRef<boolean>;
}

/**
 * @name useFocus
 * @category Browser
 * @description Reactive focus state of an element. The returned `focused` ref tracks
 * focus/blur events and can be written to in order to focus or blur the target.
 *
 * @param {MaybeComputedElementRef} target - The element (or template ref) to track.
 * @param {UseFocusOptions} [options={}] - Options
 * @returns {UseFocusReturn} An object containing the writable `focused` ref.
 *
 * @example
 * const el = useTemplateRef<HTMLInputElement>('el');
 * const { focused } = useFocus(el);
 * // focus the element imperatively
 * focused.value = true;
 *
 * @example
 * // only treat keyboard focus as focused
 * const { focused } = useFocus(el, { focusVisible: true });
 *
 * @since 0.0.15
 */
export function useFocus(
  target: MaybeComputedElementRef,
  options: UseFocusOptions = {},
): UseFocusReturn {
  const {
    initialValue = false,
    focusVisible = false,
    preventScroll = false,
  } = options;

  const innerFocused = shallowRef(false);
  const targetElement = computed(() => unrefElement(target) as HTMLElement | undefined | null);

  const listenerOptions = { passive: true } as const;

  useEventListener(
    targetElement,
    'focus',
    (event: FocusEvent) => {
      if (!focusVisible || (event.target as HTMLElement).matches?.(':focus-visible'))
        innerFocused.value = true;
    },
    listenerOptions,
  );

  useEventListener(
    targetElement,
    'blur',
    () => {
      innerFocused.value = false;
    },
    listenerOptions,
  );

  const focused = computed<boolean>({
    get: () => innerFocused.value,
    set(value: boolean) {
      if (!value && innerFocused.value)
        targetElement.value?.blur();
      else if (value && !innerFocused.value)
        targetElement.value?.focus({ preventScroll });
    },
  });

  watch(
    targetElement,
    () => {
      focused.value = initialValue;
    },
    { immediate: true, flush: 'post' },
  );

  return { focused };
}
