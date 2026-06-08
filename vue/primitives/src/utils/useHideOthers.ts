import type { MaybeComputedElementRef } from '@robonen/vue';
import { defaultWindow, tryOnScopeDispose, unrefElement } from '@robonen/vue';
import { hideOthers } from '@robonen/platform/browsers';
import { watch } from 'vue';

type Undo = () => void;

const CLOSED_POPOVER_SELECTOR = '[popover]:not(:popover-open)';

/**
 * Isolated so the try/catch doesn't inhibit Turbofan optimization of the
 * watcher callback. `:popover-open` throws in browsers that don't support it
 * (e.g. Safari 18).
 */
function isInClosedPopover(el: Element): boolean {
  try {
    return el.closest(CLOSED_POPOVER_SELECTOR) !== null;
  }
  catch {
    return false;
  }
}

/**
 * @name useHideOthers
 * @category Browser
 * @description Hides every sibling element of `target` from assistive technologies
 * by setting `aria-hidden="true"`. Automatically restores the original state when
 * the target is removed or the component scope is disposed. Skips elements living
 * inside a closed native `[popover]` to avoid double-hiding.
 *
 * @param {MaybeComputedElementRef} target Element whose siblings should be aria-hidden
 *
 * @since 0.0.14
 */
export function useHideOthers(target: MaybeComputedElementRef): void {
  if (!defaultWindow) return;

  let undo: Undo | undefined;

  watch(() => unrefElement(target), (raw) => {
    if (undo) {
      undo();
      undo = undefined;
    }

    const el = raw as HTMLElement | undefined;
    if (!el || isInClosedPopover(el)) return;

    undo = hideOthers(el);
  }, { flush: 'post' });

  tryOnScopeDispose(() => {
    if (undo) {
      undo();
      undo = undefined;
    }
  });
}
