<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The full-length rail the thumbs travel along, rendered inside `SliderRoot`.
 * It registers itself as the geometry reference for pointer math and starts a
 * drag (moving the nearest thumb to the click position) when pressed. Use it as
 * the container for `SliderRange` and one or more `SliderThumb`.
 */
export interface SliderTrackProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
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

// NOTE: the drag-initiating `pointerdown` lives on `SliderRoot`, not here —
// thumbs are siblings of the track, so a press on a thumb would never reach a
// track-level handler. The track only registers itself as the geometry ref.
</script>

<template>
  <Primitive
    :as="as"
    :ref="forwardRef"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
  >
    <slot />
  </Primitive>
</template>
