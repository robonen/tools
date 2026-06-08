import type { MaybeComputedElementRef } from '@/composables/component/unrefElement';
import { unrefElement } from '@/composables/component/unrefElement';
import { useEventListener } from '@/composables/browser/useEventListener';
import { defaultWindow } from '@/types';
import type { MaybeRefOrGetter } from 'vue';
import { toValue } from 'vue';
import type { VoidFunction } from '@robonen/stdlib';
import { noop } from '@robonen/stdlib';

export interface UseClickOutsideOptions {
  /**
   * Elements that are inside `target` semantically but physically rendered
   * elsewhere (e.g. portaled menus). Events originating in these nodes
   * are treated as *inside* clicks.
   */
  ignore?: MaybeRefOrGetter<Array<MaybeComputedElementRef | undefined>>;

  /**
   * Detect outside pointer-down instead of click. Useful for dismissable layers
   * that want to react as soon as the user starts interacting outside.
   * @default 'pointerdown'
   */
  event?: 'pointerdown' | 'mousedown' | 'click';
}

/**
 * @name useClickOutside
 * @category Sensors
 * @description Invokes `handler` when a pointer event occurs outside `target`.
 * SSR-safe: no-op on the server. Handles portaled/ignored subtrees and
 * guards against synthetic "outside" clicks on removed nodes.
 *
 * @param {MaybeComputedElementRef} target Element to watch. Events inside it are ignored.
 * @param {(event: PointerEvent | MouseEvent) => void} handler Callback invoked with the outside event
 * @param {UseClickOutsideOptions} [options] Options
 * @returns {VoidFunction} Stop handle to remove the listeners
 *
 * @since 0.0.14
 */
export function useClickOutside(
  target: MaybeComputedElementRef,
  handler: (event: PointerEvent | MouseEvent) => void,
  options: UseClickOutsideOptions = {},
): VoidFunction {
  if (!defaultWindow) return noop;

  const { event = 'pointerdown', ignore } = options;

  const listener = (e: Event) => {
    const el = unrefElement(target) as HTMLElement | undefined;
    const pe = e as PointerEvent;
    const path = (e.composedPath?.() ?? []) as Node[];
    const eventTarget = (path[0] ?? e.target) as Node | null;

    if (!el || !eventTarget) return;
    if (el === eventTarget || el.contains(eventTarget)) return;

    const ignoreList = toValue(ignore) ?? [];
    for (const ref of ignoreList) {
      const node = unrefElement(ref) as HTMLElement | undefined;
      if (node && (node === eventTarget || node.contains(eventTarget))) return;
    }

    handler(pe);
  };

  return useEventListener(defaultWindow, event, listener, { passive: true, capture: true });
}
