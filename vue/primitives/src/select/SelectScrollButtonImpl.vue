<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Shared implementation behind the up/down scroll buttons: auto-scrolls the
 * viewport in `direction` while the pointer hovers it. Internal — use
 * `SelectScrollUpButton` / `SelectScrollDownButton` instead.
 */
export interface SelectScrollButtonImplProps extends PrimitiveProps {
  /** Scroll direction: `-1` scrolls up, `1` scrolls down. */
  direction: 1 | -1;
}
</script>

<script setup lang="ts">
import { onBeforeUnmount } from 'vue';

import { useForwardExpose } from '@robonen/vue';
import { Primitive } from '../primitive';
import { useSelectContentContext } from './context';

const { as = 'div', direction } = defineProps<SelectScrollButtonImplProps>();

const { forwardRef } = useForwardExpose();
const contentCtx = useSelectContentContext();

let rafId: number | null = null;

function startAutoScroll() {
  const viewport = contentCtx.viewportRef.value;
  if (!viewport) return;

  function scroll() {
    viewport!.scrollTop += direction * 8;
    rafId = requestAnimationFrame(scroll);
  }
  rafId = requestAnimationFrame(scroll);
}

function stopAutoScroll() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

onBeforeUnmount(stopAutoScroll);
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    aria-hidden="true"
    style="cursor: default; flex-shrink: 0; display: flex; align-items: center; justify-content: center"
    @pointerenter="startAutoScroll"
    @pointerleave="stopAutoScroll"
  >
    <slot />
  </Primitive>
</template>
