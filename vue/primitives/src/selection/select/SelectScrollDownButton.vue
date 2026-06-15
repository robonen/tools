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
import { ref, watchEffect } from 'vue';

import { useEventListener, useForwardExpose } from '@robonen/vue';
import { useSelectContentContext } from './context';
import SelectScrollButtonImpl from './SelectScrollButtonImpl.vue';

const props = defineProps<SelectScrollDownButtonProps>();

const { forwardRef } = useForwardExpose();
const contentCtx = useSelectContentContext();

const canScrollDown = ref(false);
function update() {
  const viewport = contentCtx.viewportRef.value;
  canScrollDown.value = viewport ? viewport.scrollHeight - viewport.scrollTop > viewport.clientHeight + 1 : false;
}

// Re-attaches when the viewport element changes; `passive` preserved, SSR-safe.
useEventListener(contentCtx.viewportRef, 'scroll', update, { passive: true });
// Seed/refresh the initial state whenever the viewport appears or changes.
watchEffect(() => {
  if (contentCtx.viewportRef.value) update();
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
