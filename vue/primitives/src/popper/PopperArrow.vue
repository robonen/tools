<script lang="ts">
import type { PrimitiveProps } from '../primitive';
import type { Side } from './utils';

const OPPOSITE_SIDE: Record<Side, Side> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

// Hoisted to module scope — one allocation per module load instead of one per
// render. Values are primitive strings, so objects are frozen-in-practice.
const TRANSFORM_ORIGIN: Record<Side, string> = {
  top: '',
  right: '0 0',
  bottom: 'center 0',
  left: '100% 0',
};

const TRANSFORM: Record<Side, string> = {
  top: 'translateY(100%)',
  right: 'translateY(50%) rotate(90deg) translateX(-50%)',
  bottom: 'rotate(180deg)',
  left: 'translateY(50%) rotate(-90deg) translateX(50%)',
};

export interface PopperArrowProps extends PrimitiveProps {
  /** Arrow width in pixels. @default 10 */
  width?: number;
  /** Arrow height in pixels. @default 5 */
  height?: number;
}
</script>

<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { Primitive } from '../primitive';
import { computed } from 'vue';
import { useForwardExpose } from '@robonen/vue';
import { usePopperContentContext } from './context';

const { as = 'span', width = 10, height = 5 } = defineProps<PopperArrowProps>();

const { forwardRef } = useForwardExpose();
const contentContext = usePopperContentContext();
const baseSide = computed(() => OPPOSITE_SIDE[contentContext.placedSide.value]);
</script>

<template>
  <span
    :ref="(el: Element | ComponentPublicInstance | null) => {
      contentContext.onArrowChange((el as HTMLElement) ?? undefined);
      return undefined;
    }"
    :style="{
      position: 'absolute',
      left: contentContext.arrowX.value ? `${contentContext.arrowX.value}px` : undefined,
      top: contentContext.arrowY.value ? `${contentContext.arrowY.value}px` : undefined,
      [baseSide]: 0,
      transformOrigin: TRANSFORM_ORIGIN[contentContext.placedSide.value],
      transform: TRANSFORM[contentContext.placedSide.value],
      visibility: contentContext.shouldHideArrow.value ? 'hidden' : undefined,
    }"
  >
    <Primitive
      :ref="forwardRef"
      :as="as"
      :style="{ display: 'block' }"
      :width="width"
      :height="height"
    >
      <slot />
    </Primitive>
  </span>
</template>
