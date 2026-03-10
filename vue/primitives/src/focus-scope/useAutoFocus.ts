import {
  AUTOFOCUS_ON_MOUNT,
  AUTOFOCUS_ON_UNMOUNT,
  EVENT_OPTIONS,
  focus,
  focusFirst,
  getActiveElement,
  getTabbableCandidates,
} from '@robonen/platform/browsers';
import type { FocusScopeAPI } from './stack';
import type { ShallowRef } from 'vue';
import { createFocusScopesStack } from './stack';
import { watchPostEffect } from 'vue';

function dispatchCancelableEvent(
  container: HTMLElement,
  eventName: string,
  handler: (ev: Event) => void,
): CustomEvent {
  const event = new CustomEvent(eventName, EVENT_OPTIONS);
  container.addEventListener(eventName, handler);
  container.dispatchEvent(event);
  container.removeEventListener(eventName, handler);
  return event;
}

export function useAutoFocus(
  container: Readonly<ShallowRef<HTMLElement | null>>,
  focusScope: FocusScopeAPI,
  onMountAutoFocus: (ev: Event) => void,
  onUnmountAutoFocus: (ev: Event) => void,
) {
  const stack = createFocusScopesStack();

  watchPostEffect((onCleanup) => {
    const el = container.value;
    if (!el) return;

    stack.add(focusScope);
    const previouslyFocusedElement = getActiveElement();

    if (!el.contains(previouslyFocusedElement)) {
      const event = dispatchCancelableEvent(el, AUTOFOCUS_ON_MOUNT, onMountAutoFocus);

      if (!event.defaultPrevented) {
        focusFirst(getTabbableCandidates(el), { select: true });

        if (getActiveElement() === previouslyFocusedElement)
          focus(el);
      }
    }

    onCleanup(() => {
      const event = dispatchCancelableEvent(el, AUTOFOCUS_ON_UNMOUNT, onUnmountAutoFocus);

      if (!event.defaultPrevented) {
        focus(previouslyFocusedElement ?? document.body, { select: true });
      }

      stack.remove(focusScope);
    });
  });
}
