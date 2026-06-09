import { ref, watchEffect } from 'vue';
import { isClient } from '@robonen/platform/multi';
import { assignStyle } from '@robonen/platform/browsers';
import { injectDrawerRootContext } from './context';
import { getDrawerWrapper, isVertical } from './helpers';
import { BORDER_RADIUS, TRANSITIONS, WINDOW_TOP_OFFSET } from './constants';

/**
 * Scales the page background down behind the drawer (the stacked-card effect),
 * transforming the element marked `data-drawer-wrapper`. Restores everything,
 * including the body background, when the drawer closes. No-op unless
 * `shouldScaleBackground` is enabled on the root.
 */
export function useScaleBackground() {
  const { direction, isOpen, shouldScaleBackground, setBackgroundColorOnScale, noBodyStyles } = injectDrawerRootContext();
  const timeoutIdRef = ref<number | null>(null);
  const initialBackgroundColor = ref(typeof document !== 'undefined' ? document.body.style.backgroundColor : '');

  function getScale() {
    return (window.innerWidth - WINDOW_TOP_OFFSET) / window.innerWidth;
  }

  watchEffect((onCleanup) => {
    // `flush: 'pre'` watchers run during SSR; this effect touches document/window,
    // so it must stay client-only.
    if (isClient && isOpen.value && shouldScaleBackground.value) {
      if (timeoutIdRef.value)
        clearTimeout(timeoutIdRef.value);

      const wrapper = getDrawerWrapper();

      if (!wrapper)
        return;

      if (setBackgroundColorOnScale.value && !noBodyStyles.value)
        assignStyle(document.body, { background: 'black' });

      assignStyle(wrapper, {
        transformOrigin: isVertical(direction.value) ? 'top' : 'left',
        transitionProperty: 'transform, border-radius',
        transitionDuration: `${TRANSITIONS.DURATION}s`,
        transitionTimingFunction: `cubic-bezier(${TRANSITIONS.EASE.join(',')})`,
      });

      const wrapperStylesCleanup = assignStyle(wrapper, {
        borderRadius: `${BORDER_RADIUS}px`,
        overflow: 'hidden',
        ...(isVertical(direction.value)
          ? { transform: `scale(${getScale()}) translate3d(0, calc(env(safe-area-inset-top) + 14px), 0)` }
          : { transform: `scale(${getScale()}) translate3d(calc(env(safe-area-inset-top) + 14px), 0, 0)` }),
      });

      onCleanup(() => {
        wrapperStylesCleanup();
        timeoutIdRef.value = globalThis.setTimeout(() => {
          if (initialBackgroundColor.value)
            document.body.style.background = initialBackgroundColor.value;
          else
            document.body.style.removeProperty('background');
        }, TRANSITIONS.DURATION * 1000);
      });
    }
  }, { flush: 'pre' });
}
