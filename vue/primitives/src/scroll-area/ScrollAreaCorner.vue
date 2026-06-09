<script lang="ts">
import type { PrimitiveProps } from '../primitive';

/**
 * Fills the square where the horizontal and vertical scrollbars meet. It only renders when
 * both scrollbars are present and have measurable size; otherwise it is omitted.
 */
export type ScrollAreaCornerProps = PrimitiveProps;
</script>

<script setup lang="ts">
import { computed, onMounted, onScopeDispose, ref, watch } from 'vue';
import { Primitive } from '../primitive';
import { useForwardExpose } from '@robonen/vue';
import { useScrollAreaRootContext } from './context';

defineOptions({ inheritAttrs: false });

defineProps<ScrollAreaCornerProps>();

const ctx = useScrollAreaRootContext();
const { forwardRef } = useForwardExpose();

const width = ref(0);
const height = ref(0);

const hasSize = computed(() => width.value > 0 && height.value > 0);
const hasBoth = computed(() => ctx.scrollbarXEnabled.value && ctx.scrollbarYEnabled.value);

function measure() {
  const x = ctx.scrollbarX.value;
  const y = ctx.scrollbarY.value;
  width.value = y ? y.offsetWidth : 0;
  height.value = x ? x.offsetHeight : 0;
  ctx.onCornerWidthChange(width.value);
  ctx.onCornerHeightChange(height.value);
}

let xObs: ResizeObserver | null = null;
let yObs: ResizeObserver | null = null;

function attach() {
  xObs?.disconnect();
  yObs?.disconnect();
  const x = ctx.scrollbarX.value;
  const y = ctx.scrollbarY.value;
  if (x) {
    xObs = new ResizeObserver(measure);
    xObs.observe(x);
  }
  if (y) {
    yObs = new ResizeObserver(measure);
    yObs.observe(y);
  }
  measure();
}

onMounted(attach);
watch([() => ctx.scrollbarX.value, () => ctx.scrollbarY.value], attach);
onScopeDispose(() => {
  xObs?.disconnect();
  yObs?.disconnect();
});
</script>

<template>
  <Primitive
    v-if="hasBoth && hasSize"
    :ref="forwardRef"
    :as="as ?? 'div'"
    :style="{
      width: `${width}px`,
      height: `${height}px`,
      position: 'absolute',
      right: 0,
      bottom: 0,
    }"
    v-bind="$attrs"
  >
    <slot />
  </Primitive>
</template>
