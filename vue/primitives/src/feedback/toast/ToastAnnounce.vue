<script lang="ts">
/**
 * A visually-hidden live region that mirrors a toast's text for screen readers.
 *
 * The visible toast is announced via `aria-live` directly, but some screen
 * readers (notably NVDA) only reliably announce live-region content that is
 * injected *after* the region is already in the accessibility tree. This part
 * therefore mounts empty and injects its text on the next frame (double
 * `requestAnimationFrame`), with a 1s timeout fallback so the announcement
 * still happens if frames are throttled (e.g. a background tab).
 */
export interface ToastAnnounceProps {
  /** `aria-live` politeness for the announce region. */
  ariaLive?: 'assertive' | 'polite';
}
</script>

<script setup lang="ts">
import { onScopeDispose, ref } from 'vue';

import { isClient } from '@robonen/platform/multi';
import { VisuallyHidden } from '../../utilities/visually-hidden';
import { useToastProviderContext } from './context';

defineProps<ToastAnnounceProps>();

const providerCtx = useToastProviderContext();

const renderAnnounceText = ref(false);

let raf1 = 0;
let raf2 = 0;
let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

if (isClient) {
  raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      renderAnnounceText.value = true;
    });
  });

  // Fallback in case rAF is throttled (background tab) — still announce.
  fallbackTimer = setTimeout(() => {
    renderAnnounceText.value = true;
  }, 1000);

  onScopeDispose(() => {
    cancelAnimationFrame(raf1);
    cancelAnimationFrame(raf2);
    if (fallbackTimer) clearTimeout(fallbackTimer);
  });
}
</script>

<template>
  <VisuallyHidden
    v-if="renderAnnounceText"
    feature="hidden"
    role="status"
    :aria-live="ariaLive"
    :aria-atomic="true"
    data-primitives-toast-announce
  >
    {{ providerCtx.label.value }}
    <slot />
  </VisuallyHidden>
</template>
