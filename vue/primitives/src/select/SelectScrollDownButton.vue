<script lang="ts">
import type { SelectScrollButtonImplProps } from './SelectScrollButtonImpl.vue';

/**
 * An auto-scroll affordance shown at the bottom of the viewport when there is
 * content scrolled out of view below. Scrolls the viewport down while hovered
 * and hides itself when already at the bottom.
 */
export type SelectScrollDownButtonProps = Omit<SelectScrollButtonImplProps, 'direction'>;
</script>

<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useSelectContentContext } from './context';
import SelectScrollButtonImpl from './SelectScrollButtonImpl.vue';

const props = defineProps<SelectScrollDownButtonProps>();

const { forwardRef } = useForwardExpose();
const contentCtx = useSelectContentContext();

const canScrollDown = ref(false);
let cleanupFn: (() => void) | null = null;

watchEffect(() => {
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }
  const viewport = contentCtx.viewportRef.value;
  if (!viewport) return;

  const update = () => {
    canScrollDown.value = viewport.scrollHeight - viewport.scrollTop > viewport.clientHeight + 1;
  };
  viewport.addEventListener('scroll', update, { passive: true });
  update();
  cleanupFn = () => viewport.removeEventListener('scroll', update);
});

onMounted(() => {
  const viewport = contentCtx.viewportRef.value;
  if (viewport) {
    canScrollDown.value = viewport.scrollHeight - viewport.scrollTop > viewport.clientHeight + 1;
  }
});
</script>

<template>
  <SelectScrollButtonImpl
    v-if="canScrollDown"
    v-bind="props"
    :ref="forwardRef"
    :direction="1"
  >
    <slot />
  </SelectScrollButtonImpl>
</template>
