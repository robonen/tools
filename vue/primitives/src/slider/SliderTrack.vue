<script lang="ts">
import type { PrimitiveProps } from '../primitive';
export interface SliderTrackProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../primitive';
import { onBeforeUnmount, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useSliderContext } from './context';

const { as = 'span' } = defineProps<SliderTrackProps>();
const ctx = useSliderContext();
const { forwardRef, currentElement } = useForwardExpose();

watch(currentElement, (node) => {
  ctx.trackRef.value = node ?? null;
});
onBeforeUnmount(() => {
  ctx.trackRef.value = null;
});

function onPointerDown(event: PointerEvent): void {
  if (ctx.disabled.value) return;
  event.preventDefault();
  (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  ctx.startDragFromTrack(event);
}
</script>

<template>
  <Primitive
    :as="as"
    :ref="forwardRef"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
    @pointerdown="onPointerDown"
  >
    <slot />
  </Primitive>
</template>
