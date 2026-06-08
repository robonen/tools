import type { MaybeRefOrGetter } from 'vue';
import { onScopeDispose, toValue, watch } from 'vue';

type ListenerTarget = Window | Document | HTMLElement | null | undefined;

/**
 * Attach an event listener to a (possibly reactive) target, re-binding when the
 * target changes and cleaning up on scope dispose. Minimal local replacement for
 * the `@robonen/vue` composable.
 */
export function useEventListener(
  target: MaybeRefOrGetter<ListenerTarget>,
  event: string,
  handler: (event: Event) => void,
  options?: boolean | AddEventListenerOptions,
): () => void {
  let detach = (): void => {};

  const stopWatch = watch(
    () => toValue(target),
    (el) => {
      detach();
      if (!el)
        return;
      el.addEventListener(event, handler, options);
      detach = () => el.removeEventListener(event, handler, options);
    },
    { immediate: true, flush: 'post' },
  );

  const stop = (): void => {
    detach();
    stopWatch();
  };

  onScopeDispose(stop);
  return stop;
}
