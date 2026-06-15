<script lang="ts">
/**
 * A visually-hidden focusable sentinel placed at the head and tail of the toast
 * viewport. Because the viewport is portaled, its tab order does not match the
 * document; these proxies let `Tab`/`Shift+Tab` re-enter the toast list from the
 * surrounding document. When focus arrives from outside the viewport, the proxy
 * emits `focusFromOutsideViewport` so the viewport can redirect focus to a toast.
 */
export interface ToastFocusProxyEmits {
  focusFromOutsideViewport: [event: FocusEvent];
}
</script>

<script setup lang="ts">
import { VisuallyHidden } from '../../utilities/visually-hidden';
import { useToastProviderContext } from './context';

const emit = defineEmits<ToastFocusProxyEmits>();

const providerCtx = useToastProviderContext();

function handleFocus(event: FocusEvent) {
  const prevFocused = event.relatedTarget as HTMLElement | null;
  const isFromOutside = !providerCtx.viewportRef.value?.contains(prevFocused);
  if (isFromOutside) emit('focusFromOutsideViewport', event);
}
</script>

<template>
  <VisuallyHidden
    aria-hidden="true"
    tabindex="0"
    data-primitives-toast-focus-proxy
    style="position: fixed"
    @focus="handleFocus"
  >
    <slot />
  </VisuallyHidden>
</template>
