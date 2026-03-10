import type { MaybeRefOrGetter, ShallowRef } from 'vue';
import { shallowRef, toValue, watchPostEffect } from 'vue';
import type { FocusScopeAPI } from './stack';
import { focus } from '@robonen/platform/browsers';

export function useFocusTrap(
  container: Readonly<ShallowRef<HTMLElement | null>>,
  focusScope: FocusScopeAPI,
  trapped: MaybeRefOrGetter<boolean>,
) {
  const lastFocusedElement = shallowRef<HTMLElement | null>(null);

  watchPostEffect((onCleanup) => {
    const el = container.value;
    if (!toValue(trapped) || !el) return;

    function handleFocusIn(event: FocusEvent) {
      if (focusScope.paused || !el) return;

      const target = event.target as HTMLElement | null;

      if (el.contains(target)) {
        lastFocusedElement.value = target;
      }
      else {
        focus(lastFocusedElement.value, { select: true });
      }
    }

    function handleFocusOut(event: FocusEvent) {
      if (focusScope.paused || !el) return;

      const relatedTarget = event.relatedTarget as HTMLElement | null;

      // null relatedTarget = браузер/вкладка потеряла фокус или элемент удалён из DOM.
      if (relatedTarget === null) return;

      if (!el.contains(relatedTarget)) {
        focus(lastFocusedElement.value, { select: true });
      }
    }

    function handleMutations() {
      if (!el!.contains(lastFocusedElement.value))
        focus(el!);
    }

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    const observer = new MutationObserver(handleMutations);
    observer.observe(el, { childList: true, subtree: true });

    onCleanup(() => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      observer.disconnect();
    });
  });
}
