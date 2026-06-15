<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * Content shown while the image is loading or when it fails to load — typically
 * the user's initials or a generic icon. It renders only when the image is not
 * yet `loaded`, and can be delayed to avoid a flash of fallback on fast
 * connections.
 */
export interface AvatarFallbackProps extends PrimitiveProps {

  /** Delay in ms before rendering the fallback (avoids flicker on fast networks). */
  delayMs?: number;
}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { computed, ref, watch } from 'vue';
import { useAvatarContext } from './context';
import { useForwardExpose, useTimeoutFn } from '@robonen/vue';

const { as = 'span', delayMs = 0 } = defineProps<AvatarFallbackProps>();

const { forwardRef } = useForwardExpose();

const ctx = useAvatarContext();

const canShow = ref<boolean>(delayMs === 0);

// Delay rendering the fallback to avoid a flash on fast connections. The timer
// is SSR-safe and torn down automatically on scope dispose — no manual cleanup.
const { start: startDelay, stop: stopDelay } = useTimeoutFn(() => {
  canShow.value = true;
}, () => delayMs, { immediate: false });

watch(() => ctx.imageLoadingStatus.value, (status) => {
  if (status === 'loaded') {
    stopDelay();
    canShow.value = false;
    return;
  }
  if (delayMs === 0) {
    canShow.value = true;
    return;
  }
  stopDelay();
  canShow.value = false;
  startDelay();
}, { immediate: true });

const shouldRender = computed(() => canShow.value && ctx.imageLoadingStatus.value !== 'loaded');
</script>

<template>
  <Primitive :ref="forwardRef" v-if="shouldRender" :as="as">
    <slot />
  </Primitive>
</template>
