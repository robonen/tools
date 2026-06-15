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
import { ref, watch, watchEffect } from 'vue';

import { useEventListener, useForwardExpose } from '@robonen/vue';
import { useSelectContentContext, useSelectItemAlignedPositionContext } from './context';
import SelectScrollButtonImpl from './SelectScrollButtonImpl.vue';

const props = defineProps<SelectScrollUpButtonProps>();

const { forwardRef, currentElement } = useForwardExpose();
const contentCtx = useSelectContentContext();
const alignedCtx = contentCtx.position === 'item-aligned'
  ? useSelectItemAlignedPositionContext(null as never)
  : undefined;

const canScrollUp = ref(false);

// Notify the item-aligned positioner that the scroll-up button mounted so it
// can re-run alignment (the button pushes the viewport down).
watch(currentElement, (el) => {
  if (el) alignedCtx?.onScrollButtonChange(el);
});
function update() {
  const viewport = contentCtx.viewportRef.value;
  canScrollUp.value = viewport ? viewport.scrollTop > 0 : false;
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
    v-if="canScrollUp"
    v-bind="props"
    :ref="forwardRef"
    :direction="-1"
  >
    <slot />
  </SelectScrollButtonImpl>
</template>
