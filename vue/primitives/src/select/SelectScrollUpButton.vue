<script lang="ts">
import type { SelectScrollButtonImplProps } from './SelectScrollButtonImpl.vue';

/**
 * An auto-scroll affordance shown at the top of the viewport when there is
 * content scrolled out of view above. Scrolls the viewport up while hovered and
 * hides itself when already at the top.
 */
export type SelectScrollUpButtonProps = Omit<SelectScrollButtonImplProps, 'direction'>;
</script>

<script setup lang="ts">
import { onMounted, ref, watchEffect } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { useSelectContentContext } from './context';
import SelectScrollButtonImpl from './SelectScrollButtonImpl.vue';

const props = defineProps<SelectScrollUpButtonProps>();

const { forwardRef } = useForwardExpose();
const contentCtx = useSelectContentContext();

const canScrollUp = ref(false);
let cleanupFn: (() => void) | null = null;

watchEffect(() => {
  if (cleanupFn) {
    cleanupFn();
    cleanupFn = null;
  }
  const viewport = contentCtx.viewportRef.value;
  if (!viewport) return;

  const update = () => {
    canScrollUp.value = viewport.scrollTop > 0;
  };
  viewport.addEventListener('scroll', update, { passive: true });
  update();
  cleanupFn = () => viewport.removeEventListener('scroll', update);
});

onMounted(() => {
  const viewport = contentCtx.viewportRef.value;
  if (viewport) canScrollUp.value = viewport.scrollTop > 0;
});
</script>

<template>
  <SelectScrollButtonImpl
    v-if="canScrollUp"
    v-bind="props"
    :ref="forwardRef"
    :direction="-1"
  >
    <slot />
  </SelectScrollButtonImpl>
</template>
