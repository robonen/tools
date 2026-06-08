import type { WritableComputedRef } from 'vue';
import { computed, shallowRef, toRef, watch } from 'vue';
import type { VoidFunction } from '@robonen/stdlib';
import type { ConfigurableNavigator, ConfigurableWindow } from '@/types';
import { defaultNavigator, defaultWindow } from '@/types';
import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useEventListener } from '@/composables/browser/useEventListener';
import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';

type LockableElement = HTMLElement | SVGElement;

export interface UseScrollLockOptions extends ConfigurableWindow, ConfigurableNavigator {}

export type UseScrollLockReturn = WritableComputedRef<boolean>;

/**
 * Stores each element's `style.overflow` value as it was the first time we
 * touched it, so unlocking restores exactly what the author had set (rather
 * than wiping inline overflow entirely). A WeakMap keeps this from pinning
 * detached elements in memory.
 */
const elementInitialOverflow = /* #__PURE__ */ new WeakMap<LockableElement, string>();

function isIOS(navigator: Navigator | undefined): boolean {
  if (!navigator)
    return false;

  const ua = navigator.userAgent;
  // iPhone / iPod / legacy iPad, plus iPadOS 13+ which masquerades as MacIntel
  // while reporting a touch screen.
  return /iP(?:ad|hone|od)/.test(ua)
    || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1);
}

/**
 * Walks up from the touched node looking for an ancestor that can actually
 * scroll. If one exists we must NOT prevent the touchmove, otherwise nested
 * scroll regions (e.g. a modal body) become un-scrollable on iOS.
 */
function checkOverflowScroll(element: Element, window: Window): boolean {
  const style = window.getComputedStyle(element);

  if (
    style.overflowX === 'scroll'
    || style.overflowY === 'scroll'
    || (style.overflowX === 'auto' && element.clientWidth < element.scrollWidth)
    || (style.overflowY === 'auto' && element.clientHeight < element.scrollHeight)
  ) {
    return true;
  }

  const parent = element.parentNode as Element | null;

  if (!parent || parent.tagName === 'BODY')
    return false;

  return checkOverflowScroll(parent, window);
}

function preventDefault(event: TouchEvent, window: Window): void {
  const target = event.target as Element | null;

  // Allow scrolling inside genuinely scrollable descendants.
  if (target && checkOverflowScroll(target, window))
    return;

  // A multi-touch gesture (pinch-zoom) should be left alone.
  if (event.touches.length > 1)
    return;

  if (event.cancelable)
    event.preventDefault();
}

/**
 * @name useScrollLock
 * @category Sensors
 * @description Lock scrolling of an element by toggling `overflow: hidden`,
 * preserving the element's prior inline overflow and handling iOS `touchmove`.
 * Returns a writable boolean ref — set it to lock/unlock, read it for state.
 *
 * @param {MaybeComputedElementRef} element - The element (or template ref / getter) to lock.
 * @param {boolean} [initialState] - Whether the element starts locked. Defaults to `false`.
 * @param {UseScrollLockOptions} [options] - Configurable `window` / `navigator` (mainly for SSR & testing).
 * @returns {UseScrollLockReturn} A writable boolean ref; `true` while locked.
 *
 * @example
 * const el = useTemplateRef<HTMLElement>('el');
 * const isLocked = useScrollLock(el);
 * isLocked.value = true; // lock
 * isLocked.value = false; // unlock
 *
 * @since 0.0.15
 */
export function useScrollLock(
  element: MaybeComputedElementRef,
  initialState = false,
  options: UseScrollLockOptions = {},
): UseScrollLockReturn {
  const { window = defaultWindow, navigator = defaultNavigator } = options;

  const isLocked = shallowRef(initialState);
  let stopTouchMoveListener: VoidFunction | null = null;
  let initialOverflow = '';

  watch(
    toRef(element),
    () => {
      const el = unrefElement(element) as LockableElement | undefined;

      if (!el)
        return;

      const style = el.style;

      if (!elementInitialOverflow.has(el))
        elementInitialOverflow.set(el, style.overflow);

      if (style.overflow !== 'hidden')
        initialOverflow = style.overflow;

      // The element was already hidden before we attached — treat as locked.
      if (style.overflow === 'hidden') {
        isLocked.value = true;
        return;
      }

      if (isLocked.value)
        style.overflow = 'hidden';
    },
    { immediate: true },
  );

  const lock = (): void => {
    const el = unrefElement(element) as LockableElement | undefined;

    if (!el || isLocked.value)
      return;

    if (window && isIOS(navigator)) {
      stopTouchMoveListener = useEventListener(
        el as HTMLElement,
        'touchmove',
        (event: Event) => preventDefault(event as TouchEvent, window),
        { passive: false },
      );
    }

    el.style.overflow = 'hidden';
    isLocked.value = true;
  };

  const unlock = (): void => {
    const el = unrefElement(element) as LockableElement | undefined;

    if (!el || !isLocked.value)
      return;

    stopTouchMoveListener?.();
    stopTouchMoveListener = null;

    el.style.overflow = initialOverflow;
    elementInitialOverflow.delete(el);
    isLocked.value = false;
  };

  // Restore overflow and detach the iOS touchmove listener when the owning
  // scope is disposed, regardless of where the lock was triggered from.
  tryOnScopeDispose(unlock);

  return computed<boolean>({
    get() {
      return isLocked.value;
    },
    set(value) {
      if (value)
        lock();
      else
        unlock();
    },
  });
}
