<script lang="ts">
import type { PrimitiveProps } from '../primitive';

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
import { Primitive } from '../primitive';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useAvatarContext } from './context';
import { useForwardExpose } from '@robonen/vue';

const { as = 'span', delayMs = 0 } = defineProps<AvatarFallbackProps>();

const { forwardRef } = useForwardExpose();

const ctx = useAvatarContext();

const canShow = ref<boolean>(delayMs === 0);
let timer: ReturnType<typeof setTimeout> | null = null;

watch(() => ctx.imageLoadingStatus.value, (status) => {
  if (status === 'loaded') {
    canShow.value = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    return;
  }
  if (delayMs === 0) {
    canShow.value = true;
    return;
  }
  if (timer) clearTimeout(timer);
  canShow.value = false;
  timer = setTimeout(() => {
    canShow.value = true;
  }, delayMs);
}, { immediate: true });

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

const shouldRender = computed(() => canShow.value && ctx.imageLoadingStatus.value !== 'loaded');
</script>

<template>
  <Primitive :ref="forwardRef" v-if="shouldRender" :as="as">
    <slot />
  </Primitive>
</template>
