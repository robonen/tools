import { tryOnScopeDispose } from '@/composables/lifecycle/tryOnScopeDispose';
import { isClient } from '@robonen/platform/multi';
import type { VoidFunction } from '@robonen/stdlib';
import { noop } from '@robonen/stdlib';

interface LockState {
  refs: number;
  originalOverflow: string;
  originalPaddingRight: string;
  originalTouchAction: string;
}

let state: LockState | null = null;

function acquire(): VoidFunction {
  if (!isClient) return noop;

  if (!state) {
    const { body, documentElement } = document;
    const scrollbarWidth = globalThis.innerWidth - documentElement.clientWidth;

    state = {
      refs: 0,
      originalOverflow: body.style.overflow,
      originalPaddingRight: body.style.paddingRight,
      originalTouchAction: body.style.touchAction,
    };

    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';

    // Compensate scrollbar removal to prevent layout shift
    if (scrollbarWidth > 0) {
      const computedPr = Number.parseInt(globalThis.getComputedStyle(body).paddingRight, 10) || 0;
      body.style.paddingRight = `${computedPr + scrollbarWidth}px`;
    }
  }

  state.refs++;

  let released = false;
  const release = () => {
    if (released || !state) return;
    released = true;
    state.refs--;

    if (state.refs === 0) {
      document.body.style.overflow = state.originalOverflow;
      document.body.style.paddingRight = state.originalPaddingRight;
      document.body.style.touchAction = state.originalTouchAction;
      state = null;
    }
  };

  tryOnScopeDispose(release);
  return release;
}

/**
 * @name useBodyScrollLock
 * @category Sensors
 * @description Reference-counted body scroll lock. Safe to invoke from multiple
 * concurrent modals — the lock releases only after all holders release. Preserves
 * the original overflow/padding/touch-action values and compensates for scrollbar
 * removal to prevent layout shift.
 *
 * @returns {VoidFunction} Release function. Idempotent — call once per acquire.
 *
 * @since 0.0.14
 */
export function useBodyScrollLock(): VoidFunction {
  return acquire();
}
