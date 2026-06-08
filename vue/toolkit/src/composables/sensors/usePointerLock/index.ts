import { noop } from '@robonen/stdlib';
import { shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { defaultDocument } from '@/types';
import type { ConfigurableDocument } from '@/types';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/utilities/useSupported';
import { unrefElement } from '@/composables/component/unrefElement';
import type { MaybeComputedElementRef, MaybeElement } from '@/composables/component/unrefElement';
import { until } from '@/composables/watch/until';

export interface UsePointerLockOptions extends ConfigurableDocument {
  /**
   * Called when the browser raises a `pointerlockerror` for the locked target.
   *
   * `pointerlockerror` fires asynchronously, so throwing here is unrecoverable.
   * Provide a handler to observe the failure instead.
   *
   * @default noop
   */
  onError?: (event: Event) => void;
}

export interface UsePointerLockReturn {
  /**
   * Whether the Pointer Lock API is supported (SSR-safe).
   */
  isSupported: ComputedRef<boolean>;
  /**
   * The element that currently holds the pointer lock, or `null` when unlocked.
   */
  element: ShallowRef<MaybeElement>;
  /**
   * The element whose event triggered the most recent `lock` call (the
   * `event.currentTarget`), or `null` when locked programmatically / unlocked.
   */
  triggerElement: ShallowRef<MaybeElement>;
  /**
   * Request pointer lock. Accepts either a DOM `Event` (locks its
   * `currentTarget`, or the composable's `target` fallback) or an element ref.
   * Resolves with the locked element once `pointerlockchange` confirms it.
   */
  lock: (eventOrTarget: MaybeComputedElementRef | Event) => Promise<MaybeElement>;
  /**
   * Release the pointer lock. Resolves `true` once released, `false` if it was
   * not locked.
   */
  unlock: () => Promise<boolean>;
}

/**
 * @name usePointerLock
 * @category Sensors
 * @description Reactive [Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API). Locks the mouse cursor to an element and tracks the locked element reactively.
 *
 * @param {MaybeComputedElementRef} [target] Optional default element to lock when `lock` receives an `Event`
 * @param {UsePointerLockOptions} [options={}] Options
 * @returns {UsePointerLockReturn} `{ isSupported, element, triggerElement, lock, unlock }`
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * const { lock, unlock, element } = usePointerLock(el);
 * // lock on user gesture
 * function onClick() { lock(el); }
 *
 * @example
 * // lock the element that received the event
 * const { lock } = usePointerLock();
 * function onDblClick(e: MouseEvent) { lock(e); }
 *
 * @since 0.0.15
 */
export function usePointerLock(
  target?: MaybeComputedElementRef,
  options: UsePointerLockOptions = {},
): UsePointerLockReturn {
  const { document = defaultDocument, onError = noop } = options;

  const isSupported = useSupported(() => !!document && 'pointerLockElement' in document);

  const element = shallowRef<MaybeElement>();
  const triggerElement = shallowRef<MaybeElement>();

  // The element we asked the browser to lock; compared against
  // `pointerLockElement` so we only react to our own lock transitions.
  let targetElement: MaybeElement;

  if (isSupported.value) {
    const listenerOptions = { passive: true } as const;

    useEventListener(
      document,
      'pointerlockchange',
      () => {
        const currentElement = document!.pointerLockElement ?? element.value;

        if (!targetElement || currentElement !== targetElement)
          return;

        element.value = document!.pointerLockElement;

        if (!element.value)
          targetElement = triggerElement.value = null;
      },
      listenerOptions,
    );

    useEventListener(
      document,
      'pointerlockerror',
      (event: Event) => {
        const currentElement = document!.pointerLockElement ?? element.value;

        if (targetElement && currentElement === targetElement)
          onError(event);
      },
      listenerOptions,
    );
  }

  async function lock(eventOrTarget: MaybeComputedElementRef | Event): Promise<MaybeElement> {
    if (!isSupported.value)
      throw new Error('Pointer Lock API is not supported by your browser.');

    if (eventOrTarget instanceof Event) {
      triggerElement.value = eventOrTarget.currentTarget as MaybeElement;
      targetElement = unrefElement(target) ?? triggerElement.value;
    }
    else {
      triggerElement.value = null;
      targetElement = unrefElement(eventOrTarget);
    }

    if (!targetElement)
      throw new Error('Target element undefined.');

    (targetElement as Element).requestPointerLock();

    return await until(element).toBe(targetElement);
  }

  async function unlock(): Promise<boolean> {
    if (!element.value)
      return false;

    document!.exitPointerLock();
    await until(element).toBeNull();

    return true;
  }

  return {
    isSupported,
    element,
    triggerElement,
    lock,
    unlock,
  };
}
