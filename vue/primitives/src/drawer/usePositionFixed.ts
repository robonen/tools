import type { Ref } from 'vue';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { isSafari } from '@robonen/platform/browsers';

interface BodyPosition {
  position: string;
  top: string;
  left: string;
  height: string;
}

interface PositionFixedOptions {
  isOpen: Ref<boolean>;
  modal: Ref<boolean>;
  nested: Ref<boolean>;
  hasBeenOpened: Ref<boolean>;
  preventScrollRestoration: Ref<boolean>;
  noBodyStyles: Ref<boolean>;
}

// Module-level so a single restoration survives across nested drawers that each
// run this composable — only the outermost open/close should touch the body.
let previousBodyPosition: BodyPosition | null = null;

/**
 * Pins `document.body` with `position: fixed` while the drawer is open on iOS
 * Safari, where the address bar otherwise causes a jarring viewport shift. A
 * no-op on every other browser. Restores the scroll position on close.
 */
export function usePositionFixed(options: PositionFixedOptions) {
  const { isOpen, modal, nested, hasBeenOpened, preventScrollRestoration, noBodyStyles } = options;
  const activeUrl = ref(globalThis.window !== undefined ? globalThis.location.href : '');
  const scrollPos = ref(0);

  function setPositionFixed(): void {
    if (!isSafari())
      return;

    if (previousBodyPosition === null && isOpen.value && !noBodyStyles.value) {
      previousBodyPosition = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        height: document.body.style.height,
      };

      const { scrollX, innerHeight } = globalThis;

      document.body.style.setProperty('position', 'fixed', 'important');
      Object.assign(document.body.style, {
        top: `${-scrollPos.value}px`,
        left: `${-scrollX}px`,
        right: '0px',
        height: 'auto',
      });

      setTimeout(() => {
        requestAnimationFrame(() => {
          // If a bottom bar appeared after pinning, nudge the content up so it
          // isn't hidden behind it.
          const bottomBarHeight = innerHeight - window.innerHeight;
          if (bottomBarHeight && scrollPos.value >= innerHeight)
            document.body.style.top = `-${scrollPos.value + bottomBarHeight}px`;
        });
      }, 300);
    }
  }

  function restorePositionSetting(): void {
    if (!isSafari())
      return;

    if (previousBodyPosition !== null && !noBodyStyles.value) {
      const y = -Number.parseInt(document.body.style.top, 10);
      const x = -Number.parseInt(document.body.style.left, 10);

      Object.assign(document.body.style, previousBodyPosition);

      globalThis.requestAnimationFrame(() => {
        if (preventScrollRestoration.value && activeUrl.value !== globalThis.location.href) {
          activeUrl.value = globalThis.location.href;
          return;
        }

        window.scrollTo(x, y);
      });

      previousBodyPosition = null;
    }
  }

  onMounted(() => {
    function onScroll() {
      scrollPos.value = window.scrollY;
    }

    onScroll();
    window.addEventListener('scroll', onScroll);

    onUnmounted(() => {
      window.removeEventListener('scroll', onScroll);
    });
  });

  watch([isOpen, hasBeenOpened, activeUrl], () => {
    if (nested.value || !hasBeenOpened.value)
      return;

    if (isOpen.value) {
      // Standalone PWAs have no address bar to fight.
      const isStandalone = globalThis.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone)
        setPositionFixed();

      if (!modal.value) {
        setTimeout(() => {
          restorePositionSetting();
        }, 500);
      }
    }
    else {
      restorePositionSetting();
    }
  });

  return { restorePositionSetting };
}
