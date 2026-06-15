<script lang="ts">
import type { PrimitiveProps } from '../../internal/primitive';

/**
 * The `0..255` rail the levels thumbs travel along, rendered inside
 * `LevelsRoot`. It registers itself as the geometry reference for the root's
 * pointer math. Use it as the container for the histogram backdrop and the
 * `LevelsThumb`s. (Drag is initiated on each thumb, so pressing a thumb does not
 * also start a track-position drag.)
 */
export interface LevelsTrackProps extends PrimitiveProps {}
</script>

<script setup lang="ts">
import { Primitive } from '../../internal/primitive';
import { onBeforeUnmount, watch } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { useLevelsContext } from './context';

const { as = 'div' } = defineProps<LevelsTrackProps>();
const ctx = useLevelsContext();
const { forwardRef, currentElement } = useForwardExpose();

watch(currentElement, (node) => {
  ctx.trackRef.value = node ?? null;
});
onBeforeUnmount(() => {
  ctx.trackRef.value = null;
});
</script>

<template>
  <Primitive
    :ref="forwardRef"
    :as="as"
    :data-disabled="ctx.disabled.value ? '' : undefined"
    :data-orientation="ctx.orientation.value"
  >
    <slot />
  </Primitive>
</template>
