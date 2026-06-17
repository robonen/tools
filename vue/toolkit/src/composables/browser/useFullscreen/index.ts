import { computed, shallowRef } from 'vue';
import type { ComputedRef, ShallowRef } from 'vue';
import { isFunction } from '@robonen/stdlib';
import type { ConfigurableDocument } from '@/types';
import { defaultDocument } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useEventListener } from '@/composables/browser/useEventListener';
import { useSupported } from '@/composables/utilities/useSupported';
import { tryOnMounted } from '@/composables/lifecycle/tryOnMounted';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

export interface UseFullscreenOptions extends ConfigurableDocument {
  /**
   * Automatically exit fullscreen when the component is unmounted
   *
   * @default false
   */
  autoExit?: boolean;
}

export interface UseFullscreenReturn {
  /**
   * Whether the Fullscreen API is supported for the target element
   */
  isSupported: ComputedRef<boolean>;
  /**
   * Whether the target element is currently in fullscreen mode
   */
  isFullscreen: ShallowRef<boolean>;
  /**
   * Request fullscreen mode for the target element
   */
  enter: () => Promise<void>;
  /**
   * Exit fullscreen mode
   */
  exit: () => Promise<void>;
  /**
   * Toggle fullscreen mode for the target element
   */
  toggle: () => Promise<void>;
}

// Vendor-prefixed `fullscreenchange` event names across engines.
const eventHandlers = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'webkitendfullscreen',
  'mozfullscreenchange',
  'MSFullscreenChange',
] as unknown as Array<'fullscreenchange'>;

const requestMethods = [
  'requestFullscreen',
  'webkitRequestFullscreen',
  'webkitEnterFullscreen',
  'webkitEnterFullScreen',
  'webkitRequestFullScreen',
  'mozRequestFullScreen',
  'msRequestFullscreen',
] as const;

const exitMethods = [
  'exitFullscreen',
  'webkitExitFullscreen',
  'webkitExitFullScreen',
  'webkitCancelFullScreen',
  'mozCancelFullScreen',
  'msExitFullscreen',
] as const;

const fullscreenFlags = [
  'fullScreen',
  'webkitIsFullScreen',
  'webkitDisplayingFullscreen',
  'mozFullScreen',
  'msFullscreenElement',
] as const;

const fullscreenElements = [
  'fullscreenElement',
  'webkitFullscreenElement',
  'mozFullScreenElement',
  'msFullscreenElement',
] as const;

const listenerOptions = { capture: false, passive: true } as const;

/**
 * @name useFullscreen
 * @category Browser
 * @description Reactive Fullscreen API for an element (or the document element).
 * Handles vendor-prefixed fallbacks for request/exit/state detection and syncs
 * `isFullscreen` from `fullscreenchange` events. SSR-safe.
 *
 * @param {MaybeComputedElementRef} [target] Element to display fullscreen (ref, getter, or component instance). Defaults to `document.documentElement`
 * @param {UseFullscreenOptions} [options={}] Options (`document`, `autoExit`)
 * @returns {UseFullscreenReturn} `{ isSupported, isFullscreen, enter, exit, toggle }`
 *
 * @example
 * const el = useTemplateRef('el');
 * const { isFullscreen, enter, exit, toggle } = useFullscreen(el);
 *
 * @example
 * // Fullscreen the whole page
 * const { toggle } = useFullscreen();
 *
 * @since 0.0.14
 */
export function useFullscreen(
  target?: MaybeComputedElementRef,
  options: UseFullscreenOptions = {},
): UseFullscreenReturn {
  const {
    document = defaultDocument,
    autoExit = false,
  } = options;

  const targetRef = computed(() => unrefElement(target) ?? document?.documentElement);
  const isFullscreen = shallowRef(false);

  const has = (method: string): boolean =>
    Boolean((document && method in document) || (targetRef.value && method in targetRef.value));

  const requestMethod = computed<typeof requestMethods[number] | undefined>(
    () => requestMethods.find(has),
  );

  const exitMethod = computed<typeof exitMethods[number] | undefined>(
    () => exitMethods.find(has),
  );

  const fullscreenFlag = computed<typeof fullscreenFlags[number] | undefined>(
    () => fullscreenFlags.find(has),
  );

  const fullscreenElementMethod = fullscreenElements.find(m => document && m in document);

  const isSupported = useSupported(() =>
    targetRef.value
    && document
    && requestMethod.value !== undefined
    && exitMethod.value !== undefined
    && fullscreenFlag.value !== undefined);

  const isCurrentElementFullScreen = (): boolean => {
    if (fullscreenElementMethod)
      return (document as Record<string, unknown> | undefined)?.[fullscreenElementMethod] === targetRef.value;
    return false;
  };

  const isElementFullScreen = (): boolean => {
    const flag = fullscreenFlag.value;
    if (!flag)
      return false;

    const docFlag = document && (document as unknown as Record<string, unknown>)[flag];
    if (docFlag !== null && docFlag !== undefined)
      return Boolean(docFlag);

    // Fallback for WebKit / iOS Safari, where the flag lives on the element itself.
    const elFlag = (targetRef.value as unknown as Record<string, unknown> | null | undefined)?.[flag];
    if (elFlag !== null && elFlag !== undefined)
      return Boolean(elFlag);

    return false;
  };

  async function exit(): Promise<void> {
    if (!isSupported.value || !isFullscreen.value)
      return;

    const method = exitMethod.value;
    if (method) {
      const docMethod = (document as unknown as Record<string, unknown> | undefined)?.[method];
      if (isFunction(docMethod))
        await docMethod.call(document);
      else {
        // Fallback for Safari iOS, where exit lives on the element.
        const el = targetRef.value as unknown as Record<string, unknown> | null | undefined;
        const elMethod = el?.[method];
        if (isFunction(elMethod))
          await elMethod.call(targetRef.value);
      }
    }

    isFullscreen.value = false;
  }

  async function enter(): Promise<void> {
    if (!isSupported.value || isFullscreen.value)
      return;

    if (isElementFullScreen())
      await exit();

    const el = targetRef.value as unknown as Record<string, unknown> | null | undefined;
    const method = requestMethod.value;
    const elMethod = method ? el?.[method] : undefined;
    if (isFunction(elMethod)) {
      await elMethod.call(targetRef.value);
      isFullscreen.value = true;
    }
  }

  async function toggle(): Promise<void> {
    await (isFullscreen.value ? exit() : enter());
  }

  const handlerCallback = (): void => {
    const elementFullScreen = isElementFullScreen();
    // Only sync to `false`, or to `true` when *our* element is the fullscreen one,
    // so multiple instances on the page don't clobber each other.
    if (!elementFullScreen || (elementFullScreen && isCurrentElementFullScreen()))
      isFullscreen.value = elementFullScreen;
  };

  useEventListener(document, eventHandlers, handlerCallback, listenerOptions);
  useEventListener(() => targetRef.value, eventHandlers, handlerCallback, listenerOptions);

  tryOnMounted(handlerCallback, { sync: false });

  if (autoExit)
    tryOnScopeDispose(exit);

  return {
    isSupported,
    isFullscreen,
    enter,
    exit,
    toggle,
  };
}
